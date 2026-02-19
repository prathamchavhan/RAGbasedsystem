const BACKEND_URL = "http://localhost:8000";

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
    const errorData = await res.json().catch(() => ({}));
    console.error("Upload Backend Error:", errorData);
    throw new Error(errorData.error || `Upload failed with status: ${res.status}`);
  }

  return res.json();
}

export async function askQuestion(question, projectId, token) {
  const res = await fetch(`${BACKEND_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ question, project_id: projectId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Ask Backend Error:", errorData);
    throw new Error(errorData.error || `Ask failed with status: ${res.status}`);
  }

  return res.json();
}
