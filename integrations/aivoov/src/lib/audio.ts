import { createApiServiceError } from 'slates';

export let decodeAudio = (base64: string, label: string) => {
  let normalized = base64.replace(/\s/g, '');
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw createApiServiceError(`${label} must contain valid Base64-encoded audio.`);
  }
  let bytes = Buffer.from(normalized, 'base64');
  if (
    bytes.length === 0 ||
    bytes.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '')
  ) {
    throw createApiServiceError(`${label} must contain valid Base64-encoded audio.`);
  }
  return bytes;
};

export let getAudioFormat = (bytes: Buffer) => {
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE') {
    return { extension: 'wav', mimeType: 'audio/wav' };
  }
  if (bytes.toString('ascii', 0, 4) === 'fLaC') {
    return { extension: 'flac', mimeType: 'audio/flac' };
  }
  if (bytes.toString('ascii', 0, 4) === 'OggS') {
    return { extension: 'ogg', mimeType: 'audio/ogg' };
  }
  if (
    bytes.toString('ascii', 0, 3) === 'ID3' ||
    (bytes.length >= 4 &&
      bytes[0] === 0xff &&
      (bytes[1]! & 0xe0) === 0xe0 &&
      (bytes[1]! & 0x18) !== 0x08 &&
      (bytes[1]! & 0x06) !== 0 &&
      (bytes[2]! & 0xf0) !== 0xf0 &&
      (bytes[2]! & 0x0c) !== 0x0c)
  ) {
    return { extension: 'mp3', mimeType: 'audio/mpeg' };
  }
  return undefined;
};
