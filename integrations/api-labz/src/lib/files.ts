import { isApiErrorRecord } from 'slates';

// Follow the public playground's file-link fields without changing raw module output.
export let getModuleFileUrl = (response: unknown): string | undefined => {
  let candidates: unknown[] = [response];
  if (isApiErrorRecord(response)) {
    for (let key of ['url', 'link', 'fileUrl', 'downloadUrl', 'href', 'imageUrl']) {
      candidates.push(response[key]);
    }
    if (isApiErrorRecord(response.response)) {
      for (let key of ['fileURL', 'url', 'link', 'downloadUrl', 'href', 'imageUrl']) {
        candidates.push(response.response[key]);
      }
    }
    if (Object.keys(response).length === 1) {
      candidates.push(Object.values(response)[0]);
    }
  }
  for (let candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    try {
      let url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') return candidate;
    } catch {
      // Module outputs may contain ordinary text or structured data instead of files.
    }
  }
  return undefined;
};
