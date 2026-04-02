"""
Local spaCy skill NER API for the GetLanded client.
Loads amjad-awad/skill-extractor from Hugging Face Hub (see model card for usage).
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

import spacy
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import snapshot_download
from pydantic import BaseModel, Field

MAX_CHARS = 12000
MODEL_ID = os.environ.get("SKILL_EXTRACTOR_MODEL_ID", "amjad-awad/skill-extractor")

nlp = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global nlp
    model_path = snapshot_download(MODEL_ID, repo_type="model")
    nlp = spacy.load(model_path)
    yield
    nlp = None


app = FastAPI(title="Skill extractor", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractBatchRequest(BaseModel):
    texts: list[str] = Field(default_factory=list)


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item.strip())
    return out


def _extract_one(text: str) -> dict:
    if nlp is None:
        raise RuntimeError("Model not loaded")

    text = (text or "")[:MAX_CHARS]
    if not text.strip():
        return {
            "skills": [],
            "role_terms": [],
            "entities": [],
        }

    doc = nlp(text)
    skills: list[str] = []
    role_terms: list[str] = []
    entities_out: list[dict] = []

    for ent in doc.ents:
        raw = ent.text.strip()
        if not raw:
            continue
        label_u = ent.label_.upper()
        entities_out.append({"text": raw, "label": ent.label_})

        if "SKILL" in label_u:
            skills.append(raw)
        elif any(
            key in label_u
            for key in ("TITLE", "ROLE", "JOB", "POSITION", "OCCUPATION", "DESIGNATION")
        ):
            role_terms.append(raw)

    return {
        "skills": _dedupe_preserve_order(skills),
        "role_terms": _dedupe_preserve_order(role_terms),
        "entities": entities_out,
    }


@app.get("/health")
def health():
    return {"ok": bool(nlp)}


@app.post("/api/extract/batch")
def extract_batch(req: ExtractBatchRequest):
    if not nlp:
        raise HTTPException(status_code=503, detail="Model not ready")
    if len(req.texts) > 64:
        raise HTTPException(status_code=400, detail="Max 64 texts per batch")

    results = [_extract_one(t) for t in req.texts]
    return {"results": results}
