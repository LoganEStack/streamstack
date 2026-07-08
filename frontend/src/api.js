const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export function listVideos() {
  return request('/browse');
}

export function getVideo(publicId) {
  return request(`/v/${publicId}`);
}

export function masterPlaylistUrl(publicId) {
  return `${API_BASE}/media/${publicId}/master.m3u8`;
}

export function renditionPlaylistUrl(publicId, rendition) {
  return `${API_BASE}/media/${publicId}/${rendition}/index.m3u8`;
}

export async function uploadVideo(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/upload', { method: 'POST', body: formData });
}

export function getJobStatus(uploadToken) {
  return request(`/jobs/${uploadToken}`);
}

export function uploadMasterPlaylistUrl(uploadToken) {
  return `${API_BASE}/uploads/${uploadToken}/master.m3u8`;
}

export { API_BASE };
