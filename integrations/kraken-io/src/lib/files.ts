import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getResponseHeaderValue
} from 'slates';

const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
// Official result examples: /docs/generating-image-sets and /docs/storage-s3.
const DOWNLOAD_HOSTS = new Set(['dl.kraken.io', 's3.amazonaws.com']);
const MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
  'application/pdf'
]);
let downloadAxios = createAxios();

let matchesFileType = (bytes: Buffer, mimeType: string): boolean => {
  switch (mimeType) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/gif':
      return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'));
    case 'image/webp':
      return (
        bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bytes.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'application/pdf':
      return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/svg+xml':
      return (
        /<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8')) &&
        !/<html[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'))
      );
    case 'image/avif':
    case 'image/heic':
    case 'image/heif': {
      if (bytes.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
      let boxSize = bytes.readUInt32BE(0);
      if (boxSize < 16 || boxSize > bytes.length || boxSize % 4 !== 0) return false;
      let supportedBrands =
        mimeType === 'image/avif'
          ? ['avif', 'avis']
          : ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'];
      if (supportedBrands.includes(bytes.subarray(8, 12).toString('ascii'))) return true;
      for (let offset = 16; offset < boxSize; offset += 4) {
        if (supportedBrands.includes(bytes.subarray(offset, offset + 4).toString('ascii')))
          return true;
      }
      return false;
    }
    default:
      return false;
  }
};

export let downloadOptimizedFile = async (url: string): Promise<Response> => {
  try {
    let parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      !DOWNLOAD_HOSTS.has(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.hash
    ) {
      throw createApiServiceError(
        'The optimized file URL is not an approved HTTPS download location.'
      );
    }
    let response = await downloadAxios.get<ArrayBuffer>(parsed.href, {
      responseType: 'arraybuffer',
      maxRedirects: 0,
      maxContentLength: MAX_DOWNLOAD_BYTES,
      timeout: 30_000
    });
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    let bytes = Buffer.from(response.data);
    let contentLength = getResponseHeaderValue(response.headers, 'content-length');
    if (
      contentLength !== undefined &&
      (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_DOWNLOAD_BYTES)
    ) {
      throw createApiServiceError(
        'The optimized file has an invalid or unsupported download size.'
      );
    }
    if (
      !mimeType ||
      !MIME_TYPES.has(mimeType) ||
      bytes.length === 0 ||
      bytes.length > MAX_DOWNLOAD_BYTES ||
      !matchesFileType(bytes, mimeType)
    ) {
      throw createApiServiceError(
        'The optimized file did not have a supported file type and size.'
      );
    }
    return new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } });
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'Kraken.io',
      operation: 'file download',
      reason: 'krakenio_file_download_error',
      extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
    });
  }
};
