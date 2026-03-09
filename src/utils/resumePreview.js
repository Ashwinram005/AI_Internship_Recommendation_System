const DOC_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PDF_MIME_TYPE = "application/pdf";

const getFileExtension = (fileName = "") => fileName.toLowerCase().split(".").pop() || "";

export const inferResumeMimeType = ({ mimeType, fileName, dataUrl }) => {
  if (mimeType) return mimeType;

  const ext = getFileExtension(fileName);
  if (ext === "pdf") return PDF_MIME_TYPE;
  if (ext === "doc") return "application/msword";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (dataUrl?.startsWith("data:")) {
    const candidate = dataUrl.slice(5).split(";")[0];
    if (candidate) return candidate;
  }

  return "application/octet-stream";
};

export const dataUrlToBlob = async (dataUrl) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const isPdfResume = (resume) =>
  inferResumeMimeType(resume).toLowerCase().includes("pdf");

export const isDocResume = (resume) => {
  const mime = inferResumeMimeType(resume).toLowerCase();
  return DOC_MIME_TYPES.has(mime);
};

export const openResumeInNewTab = async (resume) => {
  if (!resume?.base64Data) {
    throw new Error("Resume file is unavailable.");
  }

  // Open the tab synchronously to avoid popup blockers, then navigate once blob is ready.
  const newTab = window.open("about:blank", "_blank");
  if (!newTab) {
    throw new Error("Popup blocked. Please allow popups for this site.");
  }

  const blob = await dataUrlToBlob(resume.base64Data);
  const blobUrl = URL.createObjectURL(blob);
  newTab.location.href = blobUrl;

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

const dataUrlToArrayBuffer = (dataUrl) => {
  const base64Part = dataUrl.split(",")[1] || "";
  const binary = window.atob(base64Part);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const convertDocToHtml = async (resume) => {
  if (!resume?.base64Data) {
    throw new Error("Resume file is unavailable.");
  }

  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = dataUrlToArrayBuffer(resume.base64Data);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value || "";
};
