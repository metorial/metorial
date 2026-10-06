import type { SlateAddAttachmentInput } from 'slates';
import { createAxios, getResponseHeaderValue } from 'slates';
import { containsCredential, invalidResponse, upstreamError } from './errors';
import type { Job } from './schemas';

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 20;
type Delivery = {
  auth: { token: string; refreshToken?: string };
  addAttachment(input: SlateAddAttachmentInput): Promise<void>;
};
export const exportFiles = (job: Job) =>
  job.tasks.flatMap(task =>
    task.operation === 'export/url' && task.status === 'finished'
      ? (task.result?.files ?? []).map(file => ({ ...file, taskId: task.id }))
      : []
  );
export const deliveryFiles = (job: Job, fileIndex?: number) => {
  const all = exportFiles(job);
  if (
    fileIndex !== undefined &&
    (!Number.isSafeInteger(fileIndex) || fileIndex < 0 || fileIndex >= all.length)
  )
    throw invalidResponse(`Job ${job.id} has no result at the requested file index.`);
  const files = fileIndex === undefined ? all : [all[fileIndex]!];
  if (files.length > MAX_FILES)
    throw invalidResponse(
      `Job ${job.id} has more than 20 result files. Use download_job_files with one zero-based fileIndex at a time before the job expires.`
    );
  return files.map(file => {
    if (!file.url)
      throw invalidResponse(
        `Job ${job.id} returned a result without a download URL. Read the existing job before attempting another conversion.`
      );
    let url: URL;
    try {
      url = new URL(file.url);
    } catch {
      throw invalidResponse(`Job ${job.id} returned an invalid result download URL.`);
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !(
        url.hostname === 'storage.cloudconvert.com' ||
        url.hostname.endsWith('.storage.cloudconvert.com') ||
        url.hostname === 'storage.sandbox.cloudconvert.com' ||
        url.hostname.endsWith('.storage.sandbox.cloudconvert.com')
      )
    )
      throw invalidResponse(
        `Job ${job.id} returned an unsupported result download host. Use the provider dashboard to inspect the existing job.`
      );
    if (
      !file.filename ||
      file.filename !== file.filename.trim() ||
      [...file.filename].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) ||
      /[\\/]/.test(file.filename)
    )
      throw invalidResponse(`Job ${job.id} returned an invalid result filename.`);
    return { ...file, url: url.href };
  });
};
export async function deliverJobFiles(ctx: Delivery, job: Job, fileIndex?: number) {
  const files = deliveryFiles(job, fileIndex);
  for (const file of files) {
    let result: { status: number; data: unknown; headers: unknown };
    try {
      result = await createAxios({
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: MAX_FILE_BYTES
      }).get<ArrayBuffer>(file.url, {
        responseType: 'arraybuffer',
        headers: { Accept: '*/*' }
      });
    } catch (error) {
      throw upstreamError(
        error,
        'download result',
        `Job ${job.id} already exists. Result URLs expire after 24 hours. Inspect this job before starting another conversion.`
      );
    }
    if (
      result.status !== 200 ||
      !(result.data instanceof ArrayBuffer || ArrayBuffer.isView(result.data))
    )
      throw invalidResponse(`Job ${job.id} did not return downloadable file bytes.`);
    const bytes = new Uint8Array(
      result.data instanceof ArrayBuffer ? result.data : result.data.buffer,
      result.data instanceof ArrayBuffer ? 0 : result.data.byteOffset,
      result.data instanceof ArrayBuffer ? result.data.byteLength : result.data.byteLength
    );
    if (!bytes.byteLength || bytes.byteLength > MAX_FILE_BYTES)
      throw invalidResponse(
        `Job ${job.id} returned an empty file or a file exceeding 32 MiB. Use its temporary provider URL directly.`
      );
    if (
      containsCredential(
        Buffer.from(bytes).toString(),
        [ctx.auth.token, ctx.auth.refreshToken].filter((value): value is string => !!value)
      )
    )
      throw invalidResponse(
        `Job ${job.id} returned connection data instead of safe downloadable content.`
      );
    const ext = file.filename.split('.').at(-1)?.toLowerCase();
    const prefix = Buffer.from(bytes.subarray(0, 16));
    if (
      (ext === 'pdf' && !prefix.toString().startsWith('%PDF-')) ||
      (ext === 'png' && prefix.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') ||
      (['jpg', 'jpeg'].includes(ext ?? '') &&
        prefix.subarray(0, 3).toString('hex') !== 'ffd8ff') ||
      (ext === 'webp' &&
        (prefix.subarray(0, 4).toString() !== 'RIFF' ||
          prefix.subarray(8, 12).toString() !== 'WEBP')) ||
      (ext === 'zip' &&
        !['504b0304', '504b0506', '504b0708'].includes(prefix.subarray(0, 4).toString('hex')))
    )
      throw invalidResponse(
        `Job ${job.id} returned bytes that do not match its result filename.`
      );
    const length = getResponseHeaderValue(result.headers, 'content-length');
    if (
      length !== undefined &&
      (!/^\d+$/.test(String(length)) || Number(length) !== bytes.byteLength)
    )
      throw invalidResponse(`Job ${job.id} returned incomplete file bytes.`);
    const mime =
      String(
        getResponseHeaderValue(result.headers, 'content-type') ?? 'application/octet-stream'
      )
        .split(';')[0]
        ?.trim()
        .toLowerCase() ?? 'application/octet-stream';
    if (
      !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mime) ||
      (['application/json', 'application/problem+json', 'text/html'].includes(mime) &&
        !/\.(?:json|html?|xhtml)$/i.test(file.filename))
    )
      throw invalidResponse(
        `Job ${job.id} returned an unexpected file type. Inspect the existing job.`
      );
    try {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(bytes, { headers: { 'content-type': mime } }),
        filename: file.filename,
        mimeType: mime
      });
    } catch {
      throw invalidResponse(
        `Job ${job.id} completed, but its file could not be delivered. Retry download_job_files with this existing job ID before creating another job.`
      );
    }
  }
  return files;
}
