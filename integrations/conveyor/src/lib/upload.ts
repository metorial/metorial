import { createApiServiceError, getBase64ByteLength } from 'slates';

export let createUpload = (
  input: {
    fileContentBase64?: string;
    fileName?: string;
    contentType?: string;
  },
  maxBytes?: number
) => {
  if (input.fileContentBase64 === undefined) return undefined;
  if (!input.fileName?.trim()) {
    throw createApiServiceError('Provide fileName when sending fileContentBase64.');
  }
  let base64 = input.fileContentBase64.replace(/\s/g, '');
  if (
    !base64 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
    Buffer.from(base64, 'base64').toString('base64').replace(/=+$/, '') !==
      base64.replace(/=+$/, '')
  ) {
    throw createApiServiceError(
      'fileContentBase64 must contain a valid, non-empty base64-encoded file.'
    );
  }
  if (maxBytes !== undefined && getBase64ByteLength(base64) > maxBytes) {
    throw createApiServiceError("The file exceeds Conveyor's 100 MB upload limit.");
  }
  return new File([Uint8Array.from(Buffer.from(base64, 'base64'))], input.fileName, {
    ...(input.contentType === undefined ? {} : { type: input.contentType })
  });
};
