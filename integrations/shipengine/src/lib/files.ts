import { createApiServiceError, createAxios, getBase64ByteLength } from 'slates';
import { apiFailure, baseUrls, containsCredential } from './client';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const formats = { pdf: 'application/pdf', png: 'image/png', zpl: 'application/zpl' } as const;
export type DocumentFormat = keyof typeof formats;
export type FileContext = {
  auth?: { token: string };
  addAttachment: (file: {
    type: 'content';
    content: Response;
    mimeType: string;
    filename: string;
  }) => Promise<unknown>;
};
export const validateDocument = (bytes: Uint8Array, format: DocumentFormat) => {
  const prefix = Buffer.from(bytes.subarray(0, 1024));
  const valid =
    format === 'pdf'
      ? prefix.subarray(0, 5).toString() === '%PDF-'
      : format === 'png'
        ? prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : prefix.toString().trimStart().startsWith('^XA') &&
          Buffer.from(bytes).toString().trimEnd().endsWith('^XZ');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || !valid)
    throw createApiServiceError(
      'The provider did not return a valid, supported shipping document. Request the file again.'
    );
};
export const downloadDocument = async (
  url: string,
  format: DocumentFormat,
  token?: string
): Promise<Uint8Array> => {
  if (url.startsWith('data:')) {
    const match =
      /^data:(application\/pdf|image\/png|application\/zpl);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
        url
      );
    if (
      !match ||
      match[1] !== formats[format] ||
      !match[2] ||
      match[2].length % 4 !== 0 ||
      getBase64ByteLength(match[2]) > MAX_FILE_BYTES
    )
      throw createApiServiceError(
        'ShipEngine returned invalid document data. Request the file again.'
      );
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.toString('base64') !== match[2])
      throw createApiServiceError('ShipEngine returned invalid document data.');
    validateDocument(bytes, format);
    return bytes;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError('The provider download URL is invalid.');
  }
  if (
    !baseUrls.some(host => parsed.origin === host) ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    !parsed.pathname.startsWith('/v1/downloads/')
  )
    throw createApiServiceError(
      'The provider download URL is unsupported. Request the document again.'
    );
  const axios = createAxios({
    timeout: 30_000,
    maxRedirects: 0,
    maxContentLength: MAX_FILE_BYTES,
    responseType: 'arraybuffer',
    validateStatus: () => true
  });
  let result: { status: number; data: ArrayBuffer | Uint8Array };
  try {
    result = await axios.get(url, { headers: token ? { 'API-Key': token } : {} });
  } catch {
    throw apiFailure();
  }
  if (result.status < 200 || result.status >= 300) throw apiFailure(result.status);
  const bytes = new Uint8Array(result.data);
  validateDocument(bytes, format);
  return bytes;
};
export const addDocument = async (
  ctx: FileContext,
  url: string,
  id: string,
  format: DocumentFormat,
  token?: string
) => {
  const bytes = await downloadDocument(url, format, token);
  if (ctx.auth?.token && containsCredential(Buffer.from(bytes).toString(), ctx.auth.token))
    throw createApiServiceError(
      'The provider document contains sensitive connection data. Retrieve the existing resource through the provider before trying again.'
    );
  try {
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes).buffer, {
        headers: { 'content-type': formats[format] }
      }),
      mimeType: formats[format],
      filename: `${id}.${format}`
    });
  } catch {
    throw createApiServiceError(
      'The shipping document could not be prepared. Try downloading the existing resource again.'
    );
  }
  return { filename: `${id}.${format}`, mimeType: formats[format], size: bytes.byteLength };
};
