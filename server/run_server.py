"""Start the skill extractor with uvicorn.

- Local: SKILL_EXTRACTOR_PORT (default 8765), bind 127.0.0.1 unless SKILL_EXTRACTOR_BIND is set.
- Render / PaaS: PORT is set → bind 0.0.0.0 and use that port.
"""
import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT") or os.environ.get("SKILL_EXTRACTOR_PORT", "8765"))
    if os.environ.get("PORT"):
        host = "0.0.0.0"
    else:
        host = os.environ.get("SKILL_EXTRACTOR_BIND", "127.0.0.1")
    uvicorn.run("skill_extractor_server:app", host=host, port=port)
