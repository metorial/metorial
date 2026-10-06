import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { Client } from './client';
import type { File } from './schemas';
import { id, invalid, path, safeData, token, url } from './validation';

export const downloadReference = z
  .object({
    fileId: z.string(),
    versionId: z.string().optional(),
    assetId: z.string(),
    filePath: z.string(),
    versionInfoId: z.string(),
    cdnVersion: z.string().min(1).nullable(),
    endpoint: z.string(),
    connection: z.string()
  })
  .strict();
export type DownloadReference = z.infer<typeof downloadReference>;
export const connection = (key: string) =>
  createHash('sha256').update(token(key)).digest('hex');
function endpointFor(file: File, configured?: string) {
  const asset = url(file.url, true),
    filePath = path(file.filePath, 'File path', false);
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  if (!encoded.startsWith('/') || !asset.pathname.endsWith(encoded))
    throw invalid('The returned asset URL does not match its exact Media Library path.');
  const prefix = asset.pathname.slice(0, -encoded.length);
  let endpoint = `${asset.origin}${prefix}`;
  if (configured !== undefined) {
    const chosen = url(configured, true);
    if (
      chosen.search ||
      chosen.port ||
      chosen.hostname === 'localhost' ||
      !chosen.hostname.includes('.') ||
      /^(?:\d+\.){3}\d+$/.test(chosen.hostname) ||
      chosen.hostname.includes(':')
    )
      throw invalid(
        'Configure the exact HTTPS ImageKit CDN endpoint without query parameters, ports, or local/IP hosts.'
      );
    endpoint = chosen.href.replace(/\/$/, '');
    if (endpoint !== `${asset.origin}${prefix}`)
      throw invalid(
        'The configured CDN endpoint differs from this file’s provider URL. Use its exact endpoint from ImageKit.'
      );
  } else if (
    asset.hostname !== 'ik.imagekit.io' ||
    asset.port ||
    !prefix.replaceAll('/', '') ||
    prefix.split('/').some(v => v.startsWith('tr:'))
  ) {
    throw invalid(
      'For a custom CDN domain, configure urlEndpoint to match this file’s exact ImageKit endpoint.'
    );
  }
  if (
    [...asset.searchParams.keys()].some(k => !['updatedAt', 'ik-obj-version'].includes(k)) ||
    [...asset.searchParams.keys()].some(k => asset.searchParams.getAll(k).length !== 1)
  )
    throw invalid(
      'ImageKit returned a noncanonical or transformed file URL. Request the original file details again.'
    );
  return { asset, endpoint };
}
export function signOriginal(file: File, key: string, configured?: string, now = Date.now()) {
  const { asset, endpoint } = endpointFor(file, configured);
  asset.searchParams.set('tr', 'orig-true');
  asset.searchParams.set('ik-attachment', 'true');
  const unsigned = asset.href,
    expiry = Math.floor(now / 1000) + 300;
  const relative = unsigned.slice(`${endpoint}/`.length);
  const signature = createHmac('sha1', token(key))
    .update(relative + expiry)
    .digest('hex');
  // Match the official SDK: sign the encoded URL with existing query before adding expiry/signature.
  const signed = `${unsigned}&ik-t=${expiry}&ik-s=${signature}`;
  safeData(signed, key);
  return { url: signed, expiresAt: new Date(expiry * 1000).toISOString(), endpoint };
}
export async function downloadDetails(
  key: string,
  fileId: string,
  versionId?: string,
  configured?: string,
  previous?: DownloadReference
) {
  id(fileId);
  if (versionId !== undefined) id(versionId);
  if (previous && previous.connection !== connection(key))
    throw invalid(
      'The download belongs to a different connection. Request it again with this connection.'
    );
  const client = new Client({ token: key }),
    current = await client.getFileDetails(fileId);
  let file = current;
  if (
    previous &&
    versionId === undefined &&
    current.versionInfo?.id !== previous.versionInfoId
  )
    throw invalid('The current file version changed. Request a new download.');
  const selected = versionId;
  if (selected !== undefined && current.versionInfo?.id !== selected) {
    const versions = await client.listFileVersions(fileId),
      matches = versions.filter(v => v.versionInfo?.id === selected);
    if (matches.length !== 1)
      throw invalid('This file version is unavailable. Request the desired file again.');
    file = await client.getFileVersionDetails(fileId, selected);
    if (
      file.fileId !== matches[0]!.fileId ||
      file.filePath !== current.filePath ||
      file.url !== matches[0]!.url
    )
      throw invalid('ImageKit returned conflicting file version details.');
  }
  if (!file.versionInfo?.id)
    throw invalid(
      'ImageKit did not return a stable version ID for this download. Request file details again.'
    );
  if (selected !== undefined && file.versionInfo.id !== selected)
    throw invalid('ImageKit returned a different file version.');
  const cdnVersion = url(file.url, true).searchParams.get('ik-obj-version');
  if (cdnVersion === '' || (versionId !== undefined && cdnVersion === null))
    throw invalid(
      'ImageKit did not return a version-specific CDN URL. Omit versionId to download the current file, or select an existing historical version.'
    );
  if (file.isPublished === false)
    throw invalid(
      'The file is unpublished and cannot be delivered through the CDN. Publish it in ImageKit before requesting a download.'
    );
  if (
    previous &&
    (previous.fileId !== fileId ||
      previous.assetId !== file.fileId ||
      previous.filePath !== file.filePath ||
      previous.versionInfoId !== file.versionInfo.id ||
      previous.cdnVersion !== cdnVersion)
  )
    throw invalid('The original file changed or moved. Request a new download.');
  const signed = signOriginal(file, key, configured);
  if (previous && previous.endpoint !== signed.endpoint)
    throw invalid('The original CDN endpoint changed. Request a new download.');
  return {
    file,
    ...signed,
    reference: {
      fileId,
      versionId,
      assetId: file.fileId,
      filePath: file.filePath,
      versionInfoId: file.versionInfo.id,
      cdnVersion,
      endpoint: signed.endpoint,
      connection: connection(key)
    } satisfies DownloadReference
  };
}
