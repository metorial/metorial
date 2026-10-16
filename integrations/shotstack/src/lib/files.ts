import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';

type FileContext = {
  addAttachment: (
    file:
      | { type: 'url'; url: string }
      | { type: 'content'; content: Response; filename?: string }
  ) => Promise<unknown>;
};

export let attachUrl = async (ctx: FileContext, url: string | undefined) => {
  if (url === undefined) return;
  await ctx.addAttachment({ type: 'url', url });
};

// Official render and generation response examples use these two output buckets.
// These files are temporary; rereading a job cannot recreate a deleted object.
let temporaryOutputHosts = new Set([
  'shotstack-api-v1-output.s3-ap-southeast-2.amazonaws.com',
  'shotstack-api-stage-output.s3-ap-southeast-2.amazonaws.com'
]);

let binaryType = (bytes: Buffer): string | undefined => {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (bytes.subarray(0, 2).toString('ascii') === 'BM') return 'image/bmp';
  if (bytes.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) return 'video/webm';
  if (
    bytes.subarray(0, 3).toString('ascii') === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0)
  )
    return 'audio/mpeg';
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WAVE'
  )
    return 'audio/wav';
  return undefined;
};

export let attachTemporaryOutput = async (
  ctx: FileContext,
  url: string
): Promise<string | undefined> => {
  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('Shotstack returned an invalid output URL.');
    }
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      !temporaryOutputHosts.has(parsed.hostname)
    )
      throw createApiServiceError(
        'Shotstack returned an output URL outside its documented output hosts.'
      );
    // A separate unauthenticated client must never forward the API key to storage.
    let http = createAxios({
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 64 * 1024 * 1024
    });
    let response = await http.get<ArrayBuffer>(parsed.toString(), {
      responseType: 'arraybuffer'
    });
    let bytes = Buffer.from(response.data);
    let mimeType = binaryType(bytes);
    if (!mimeType || bytes.byteLength < 12)
      throw createApiServiceError('Shotstack did not return a supported media file.');
    await ctx.addAttachment({
      type: 'content',
      content: new Response(bytes, { headers: { 'Content-Type': mimeType } })
    });
    return undefined;
  } catch (error) {
    // A delivery failure must not turn a successful paid job into a failed job.
    let failure = buildApiServiceError(error, {
      providerLabel: 'Shotstack',
      reason: 'shotstack_output_delivery_error',
      extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
    });
    return `The job status is unchanged, but its downloadable media could not be prepared. ${failure.message} Temporary output can be deleted by Shotstack; retrieve it before deletion or use a hosted CDN asset when available.`;
  }
};
