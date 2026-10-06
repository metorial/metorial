import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Client } from './client';
import { type Document, fail, id, record, string } from './validation';

export const referenceSchema = z
  .object({
    region: z.enum(['us', 'eu', 'au', 'ca']),
    ownerId: z.string(),
    jobId: z.string(),
    kind: z.enum(['file', 'diagnostics']),
    fileId: z.string().optional(),
    binding: z.string(),
    origin: z.string(),
    path: z.string()
  })
  .strict();
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function signedUrl(value: unknown) {
  let url: URL;
  try {
    url = new URL(string(value, 'signed file URL'));
  } catch {
    throw fail('Celigo did not return a usable signed file URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !(
      url.hostname === 's3.amazonaws.com' ||
      /^[a-z\d][a-z\d.-]*\.s3(?:[.-][a-z\d-]+)?\.amazonaws\.com$/.test(url.hostname)
    )
  )
    throw fail('Celigo returned an unsupported file host.');
  for (const [key] of url.searchParams)
    if (url.searchParams.getAll(key).length !== 1)
      throw fail('The file URL contains ambiguous signature parameters.');
  const stamp = url.searchParams.get('X-Amz-Date');
  const seconds = url.searchParams.get('X-Amz-Expires');
  if (
    !stamp ||
    !/^\d{8}T\d{6}Z$/.test(stamp) ||
    !seconds ||
    !/^\d+$/.test(seconds) ||
    Number(seconds) <= 0 ||
    Number(seconds) > 604800 ||
    url.searchParams.get('X-Amz-Algorithm') !== 'AWS4-HMAC-SHA256' ||
    !url.searchParams.get('X-Amz-Credential') ||
    !/^([a-f\d]{64})$/i.test(url.searchParams.get('X-Amz-Signature') ?? '')
  )
    throw fail(
      'The file URL does not carry a supported native expiry/signature. Request the file again or download it in Celigo.'
    );
  const issued = Date.parse(
    `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`
  );
  const expires = issued + Number(seconds) * 1000;
  if (
    !Number.isFinite(issued) ||
    `${new Date(issued).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z` !== stamp ||
    expires <= Date.now() + 5000 ||
    issued > Date.now() + 300000
  )
    throw fail('The file URL is expired or its timestamp is invalid. Request the file again.');
  return {
    url: url.toString(),
    origin: url.origin,
    path: url.pathname,
    expiresAt: new Date(expires).toISOString()
  };
}
export async function prepareFile(
  client: Client,
  input: { jobId: string; kind: 'file' | 'diagnostics'; fileId?: string }
) {
  const job = await client.get('jobs', id(input.jobId));
  const ownerId = id((await client.tokenInfo())._userId);
  let file: Document | undefined;
  if (input.kind === 'file') {
    const fileId = string(input.fileId, 'job file ID');
    if (!Array.isArray(job.files)) throw fail('The job has no file references.');
    const matches = job.files.map(v => record(v)).filter(v => v.id === fileId);
    if (matches.length !== 1)
      throw fail('The file ID does not identify exactly one current file on this job.');
    file = matches[0]!;
    if (file.host !== 's3')
      throw fail(
        'This file is not an S3 job artifact supported by the signed-URL API. Use the underlying storage provider.'
      );
  } else if (input.fileId !== undefined)
    throw fail('fileId is only valid for the file branch.');
  const result = await client.request(
    input.kind === 'file' ? 'POST' : 'GET',
    `/jobs/${id(input.jobId)}/${input.kind === 'file' ? 'files/signedURL' : 'diagnostics'}`,
    input.kind === 'file' ? { fileIds: [input.fileId] } : undefined,
    undefined,
    input.kind === 'file' ? [201, 204] : [200, 204]
  );
  if (result.status === 204)
    throw fail(
      'The exact job artifact is unavailable, not yet generated, or purged. No downloadable file was produced.'
    );
  const doc = record(result.data);
  let rawUrl: unknown;
  if (input.kind === 'file') {
    if (
      !Array.isArray(doc.signedURLs) ||
      doc.signedURLs.length !== 1 ||
      (doc.signedURL !== undefined && doc.signedURL !== null)
    )
      throw fail('Celigo did not return exactly one URL for the requested job file.');
    rawUrl = doc.signedURLs[0];
  } else if (typeof doc.signedURL === 'string') rawUrl = doc.signedURL;
  else if (Array.isArray(doc.signedURLs) && doc.signedURLs.length === 1)
    rawUrl = doc.signedURLs[0];
  else throw fail('Celigo did not return exactly one diagnostic archive URL.');
  const download = signedUrl(rawUrl);
  const binding = hash({
    jobId: id(job._id),
    type: job.type ?? null,
    flowId: job._flowId ?? null,
    flowJobId: job._flowJobId ?? null,
    exportId: job._exportId ?? null,
    importId: job._importId ?? null,
    file: file ?? null
  });
  const filename =
    input.kind === 'diagnostics'
      ? `celigo-job-${id(job._id)}-diagnostics.zip`
      : `celigo-job-${id(job._id)}-${createHash('sha256').update(input.fileId!).digest('hex').slice(0, 12)}${typeof file?.name === 'string' && /\.[a-z\d]{1,10}$/i.test(file.name) ? file.name.match(/\.[a-z\d]{1,10}$/i)![0] : '.bin'}`;
  const reference = {
    region: client.region,
    ownerId,
    jobId: id(job._id),
    kind: input.kind,
    fileId: input.fileId,
    binding,
    origin: download.origin,
    path: download.path
  };
  return {
    ...download,
    reference,
    filename,
    mimeType: input.kind === 'diagnostics' ? 'application/zip' : 'application/octet-stream'
  };
}
