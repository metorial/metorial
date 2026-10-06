import { createHash } from 'node:crypto';
import { type Client, malformed } from './client';
import { control, invalid, record } from './connection';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function fileBinding(client: Client) {
  return hash({
    instance: client.config.baseUrl,
    version: client.config.apiVersion,
    mode: client.config.authMode,
    principal: client.config.userId ?? hash(client.config.token),
    origins: client.config.mediaOrigins
  });
}
export function fileUrl(client: Client, file: Record<string, unknown>) {
  if (typeof file.url !== 'string' || !file.url || control(file.url)) throw malformed();
  let url: URL;
  try {
    url = new URL(file.url, `${client.config.baseUrl}/`);
  } catch {
    throw malformed();
  }
  const instance = new URL(client.config.baseUrl);
  if (
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && url.origin === instance.origin)) ||
    url.username ||
    url.password ||
    url.hash ||
    (url.origin !== instance.origin && !client.config.mediaOrigins.includes(url.origin))
  )
    throw invalid(
      'This file URL is outside the connected instance and trusted media origins. Add the exact HTTPS storage origin to the connection settings, then request the file again.'
    );
  if (
    url.origin === instance.origin &&
    instance.pathname !== '/' &&
    !url.pathname.startsWith(`${instance.pathname}/`)
  )
    throw invalid(
      'The file URL is outside the connected deployment path. Verify the instance and media storage settings.'
    );
  return url;
}
export function fileIdentity(client: Client, file: Record<string, unknown>) {
  const url = fileUrl(client, file);
  if (
    typeof file.hash !== 'string' ||
    !file.hash ||
    typeof file.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(file.updatedAt)) ||
    typeof file.mime !== 'string' ||
    typeof file.name !== 'string'
  )
    throw malformed();
  return hash({
    id: file.id,
    documentId: file.documentId,
    hash: file.hash,
    updatedAt: file.updatedAt,
    createdAt: file.createdAt,
    mime: file.mime,
    size: file.size,
    provider: file.provider,
    path: `${url.origin}${url.pathname}`
  });
}
function signedExpiry(url: URL) {
  const date = url.searchParams.get('X-Amz-Date'),
    duration = url.searchParams.get('X-Amz-Expires');
  if (
    !date ||
    !/^\d{8}T\d{6}Z$/.test(date) ||
    !duration ||
    !/^\d+$/.test(duration) ||
    !url.searchParams.get('X-Amz-Signature')
  )
    throw invalid(
      'This private media provider did not expose a supported signed URL expiry. Request a supported existing media URL from the instance; its lifetime cannot be guessed.'
    );
  const start = Date.parse(
    `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
  );
  const seconds = Number(duration),
    end = start + seconds * 1000;
  if (
    !Number.isFinite(start) ||
    !Number.isSafeInteger(seconds) ||
    seconds < 1 ||
    seconds > 604800 ||
    end <= Date.now()
  )
    throw invalid(
      'The provider signed URL is already expired or its expiry is invalid. Request the file again.'
    );
  return new Date(end).toISOString();
}
export async function download(client: Client, fileId: number) {
  if (client.config.authMode === 'jwt_login' && client.config.userId !== undefined)
    await client.getMe();
  const file = await client.getFile(fileId),
    url = fileUrl(client, file);
  if (
    typeof file.mime !== 'string' ||
    !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(file.mime) ||
    typeof file.name !== 'string' ||
    !file.name ||
    control(file.name)
  )
    throw malformed();
  const signed = file.isUrlSigned === true;
  if (
    !signed &&
    (url.searchParams.has('X-Amz-Signature') || url.searchParams.has('X-Amz-Expires'))
  )
    throw malformed();
  const expiresAt = signed ? signedExpiry(url) : undefined;
  return {
    file,
    url: url.toString(),
    expiresAt,
    ...(expiresAt
      ? {
          reference: {
            fileId,
            binding: fileBinding(client),
            identity: fileIdentity(client, file),
            path: `${url.origin}${url.pathname}`
          }
        }
      : {})
  };
}
export async function renew(client: Client, value: unknown, oldUrl: string) {
  if (
    !record(value) ||
    !Number.isSafeInteger(value.fileId) ||
    typeof value.binding !== 'string' ||
    typeof value.identity !== 'string' ||
    typeof value.path !== 'string' ||
    value.binding !== fileBinding(client)
  )
    throw invalid(
      'The saved file connection changed. Request the file again with the intended connection.'
    );
  let old: URL;
  try {
    old = new URL(oldUrl);
  } catch {
    throw invalid('The saved file URL is invalid. Request the file again.');
  }
  if (`${old.origin}${old.pathname}` !== value.path)
    throw invalid(
      'The saved URL does not identify the original media file. Request it again.'
    );
  const result = await download(client, Number(value.fileId));
  if (
    !result.expiresAt ||
    !result.reference ||
    result.reference.identity !== value.identity ||
    result.reference.path !== value.path
  )
    throw invalid(
      'The original media file or authorization changed. Request the current file again instead of renewing this result.'
    );
  return { url: result.url, expiresAt: result.expiresAt, headers: {}, query: {} };
}
