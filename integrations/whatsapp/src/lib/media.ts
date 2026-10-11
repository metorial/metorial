import { z } from 'zod';

// Media URLs expire after 5 minutes; refresh a little early.
export let WHATSAPP_MEDIA_URL_REFRESH_MS = 4 * 60 * 1000;

let MEDIA_HOST_SUFFIXES = ['.fbsbx.com', '.facebook.com', '.fbcdn.net', '.whatsapp.net'];

export let whatsappMediaReferenceSchema = z.object({
  mediaId: z.string().min(1)
});

export let getOfficialWhatsAppMediaUrl = (value: string | undefined) => {
  let url: URL | undefined;
  try {
    url = value ? new URL(value) : undefined;
  } catch {
    url = undefined;
  }
  if (
    !url ||
    url.protocol !== 'https:' ||
    !MEDIA_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix))
  ) {
    return undefined;
  }
  return url.toString();
};

export let getWhatsAppMediaUrlExpiry = () =>
  new Date(Date.now() + WHATSAPP_MEDIA_URL_REFRESH_MS).toISOString();
