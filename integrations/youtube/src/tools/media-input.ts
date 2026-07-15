import { youtubeServiceError } from '../lib/errors';

export let decodeBase64Content = (value: string, label: string) => {
  let normalized = value.replace(/\s/g, '');
  let validBase64 =
    normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized);
  if (!validBase64) {
    throw youtubeServiceError(`${label} must contain valid standard base64 data.`);
  }
  return Buffer.from(normalized, 'base64');
};

export let validateThumbnailContent = (
  content: Buffer,
  mimeType: 'image/jpeg' | 'image/png'
) => {
  let isJpeg =
    content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  let pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  let isPng =
    content.length >= pngSignature.length &&
    pngSignature.every((value, index) => content[index] === value);

  if ((mimeType === 'image/jpeg' && !isJpeg) || (mimeType === 'image/png' && !isPng)) {
    throw youtubeServiceError(`contentBase64 does not contain a valid ${mimeType} signature.`);
  }
};
