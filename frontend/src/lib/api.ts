const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function uploadDocument(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/docs/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Upload failed: ${response.status}`
    );
  }

  return response.json();
}

export async function verifyDocument(
  documentId: number
) {
  const response = await fetch(
    `${API_URL}/api/verification/${documentId}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Verification failed: ${response.status}`
    );
  }

  return response.json();
}