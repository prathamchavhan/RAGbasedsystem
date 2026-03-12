const BACKEND_URL = "http://localhost:8000";

async function parseError(res) {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    return json.error || json.detail || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

export async function uploadPDF(file, projectId, token) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("project_id", projectId);

  const res = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });

  if (!res.ok) {
    const errMsg = await parseError(res);
    console.error("Upload Backend Error:", errMsg);
    throw new Error(errMsg);
  }

  return res.json();
}

export async function askQuestion(question, projectId, token, history = [], ownerUid = null, allowedPdfs = []) {
  const res = await fetch(`${BACKEND_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ question, project_id: projectId, history, owner_uid: ownerUid, allowed_pdfs: allowedPdfs }),
  });

  if (!res.ok) {
    const errMsg = await parseError(res);
    console.error("Ask Backend Error:", errMsg);
    throw new Error(errMsg);
  }

  return res.json();
}
