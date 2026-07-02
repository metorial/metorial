import { azureSpeechServiceError } from './errors';

export let decodeBase64Content = (contentBase64: string, fieldName: string) => {
  let source = contentBase64.trim();
  let dataUrlMatch = /^data:([^;,]+)?;base64,(.*)$/i.exec(source);
  let normalized = (dataUrlMatch?.[2] ?? source).replace(/\s/g, '');

  if (!normalized) {
    throw azureSpeechServiceError(`${fieldName} must contain base64-encoded content.`);
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw azureSpeechServiceError(`${fieldName} must be valid base64-encoded content.`);
  }

  let bytes = Buffer.from(normalized, 'base64');
  if (bytes.length === 0) {
    throw azureSpeechServiceError(`${fieldName} must contain at least one byte.`);
  }

  return bytes;
};

export let encodeBase64Content = (content: ArrayBuffer | Buffer | Uint8Array) => {
  if (content instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(content)).toString('base64');
  }

  return Buffer.from(content).toString('base64');
};
