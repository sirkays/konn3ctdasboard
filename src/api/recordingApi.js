import { api } from ".";

export const getRecordings = async () => {
  try {
    const res = await api.get("/recording");
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const deleteRecording = async (recordID) => {
  try {
    const res = await api.delete(`/deleterecording/${recordID}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};

const triggerBrowserDownload = (href, filename) => {
  const link = document.createElement("a");
  link.href = href;
  link.setAttribute("download", filename || "recording.mp4");
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadRecordingFile = async ({ id, url, title, param } = {}) => {
  const safeName = String(title || id || "konn3ct-recording")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/(^-|-$)/g, "") || "konn3ct-recording";
  const ext = param === "chats" ? "txt" : "mp4";
  const filename = safeName.toLowerCase().endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`;

  // 1. Try authenticated backend download stream endpoint first
  try {
    const encodedId = encodeURIComponent(id || "recording");
    const res = await api.get(`/recording/download/${encodedId}`, {
      params: {
        url: url || undefined,
        filename,
        param: param || undefined,
      },
      responseType: "blob",
    });

    const contentType = String(res.headers?.["content-type"] || "");
    if (res.data instanceof Blob && !contentType.includes("application/json") && res.data.size > 0) {
      const blobUrl = window.URL.createObjectURL(res.data);
      triggerBrowserDownload(blobUrl, filename);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
      return { success: true, method: "backend-blob" };
    }
  } catch (_backendErr) {
    // Fall through to direct fetch / anchor download
  }

  // 2. Fallback: Resolve direct URL
  let fallbackUrl = url;
  if (!fallbackUrl && id) {
    if (param && process.env.REACT_APP_RECORDING_DOWNLOAD_BASE) {
      fallbackUrl = `${process.env.REACT_APP_RECORDING_DOWNLOAD_BASE.replace(/\/$/, "")}/${id}/${param}`;
    } else if (process.env.REACT_APP_VIDEO_DOWNLOAD_BASE) {
      fallbackUrl = `${process.env.REACT_APP_VIDEO_DOWNLOAD_BASE.replace(/\/$/, "")}/${id}/video/webcams.mp4`;
    } else if (process.env.REACT_APP_PLAYBACK_URL) {
      fallbackUrl = `${process.env.REACT_APP_PLAYBACK_URL.replace(/\/$/, "")}/${id}`;
    }
  }

  if (!fallbackUrl) {
    throw new Error("No video file available for download.");
  }

  // 3. Try direct fetch as Blob so cross-origin URLs still trigger file save
  try {
    const response = await fetch(fallbackUrl, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) {
        const blobUrl = window.URL.createObjectURL(blob);
        triggerBrowserDownload(blobUrl, filename);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        return { success: true, method: "direct-blob" };
      }
    }
  } catch (_corsErr) {
    // CORS blocked direct fetch; use anchor download attribute
  }

  // 4. Final fallback: anchor tag with download attribute
  triggerBrowserDownload(fallbackUrl, filename);
  return { success: true, method: "anchor" };
};
