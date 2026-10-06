import { lookup } from 'node:dns';
import { Agent } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { createApiServiceError, createAxios } from 'slates';
import { control, invalid } from './connection';

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const blocked = new BlockList();
for (const [address, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['100.64.0.0', 10],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
] as const)
  blocked.addSubnet(address, bits);
for (const [address, bits] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8]
] as const)
  blocked.addSubnet(address, bits, 'ipv6');
function publicAddress(address: string) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const normalized = mapped ?? address;
  const family = isIP(normalized);
  return family !== 0 && !blocked.check(normalized, family === 6 ? 'ipv6' : 'ipv4');
}
const sourceError = () =>
  createApiServiceError(
    'The source file could not be downloaded safely. Use an HTTPS public file URL without redirects, login requirements or internal addresses, at most 32 MiB. No upload was attempted.',
    { reason: 'strapi_upload_source', parent: {} }
  );
export function sourceUrl(value: string) {
  if (
    typeof value !== 'string' ||
    value.length > 8192 ||
    control(value) ||
    value !== value.trim()
  )
    throw sourceError();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw sourceError();
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443') ||
    !url.hostname.includes('.') ||
    /(^|\.)(localhost|local|internal|invalid|test)$/i.test(url.hostname) ||
    (isIP(hostname) && !publicAddress(hostname))
  )
    throw sourceError();
  return url.toString();
}
export async function fetchUpload(value: string) {
  const url = sourceUrl(value);
  const httpsAgent = new Agent({
    lookup: (hostname, options, callback) => {
      lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
        if (
          error ||
          !addresses.length ||
          addresses.some(item => !publicAddress(item.address))
        ) {
          callback(sourceError(), '', 4);
          return;
        }
        if (options.all) callback(null, addresses);
        else {
          const item = addresses[0]!;
          callback(null, item.address, item.family);
        }
      });
    }
  });
  const axios = createAxios({
    httpsAgent,
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: MAX_FILE_BYTES,
    proxy: false
  });
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const data = Buffer.isBuffer(response.data)
      ? response.data
      : response.data instanceof ArrayBuffer
        ? Buffer.from(response.data)
        : undefined;
    if (response.status !== 200 || !data || data.length === 0 || data.length > MAX_FILE_BYTES)
      throw sourceError();
    const declared = response.headers['content-length'];
    if (
      declared !== undefined &&
      (!/^\d+$/.test(String(declared)) || Number(declared) !== data.length)
    )
      throw sourceError();
    const mime = String(response.headers['content-type'] ?? 'application/octet-stream').split(
      ';'
    )[0]!;
    if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(mime)) throw sourceError();
    return { data, mime };
  } catch {
    throw sourceError();
  } finally {
    httpsAgent.destroy();
  }
}
export function multipart(
  source: { data: Uint8Array; mime: string },
  name: string,
  info?: { name?: string; alternativeText?: string; caption?: string }
) {
  if (info && JSON.stringify(info).length > 65536)
    throw invalid('Keep file metadata within 64 KiB.');
  const form = new FormData();
  const bytes = Uint8Array.from(source.data);
  form.append('files', new Blob([bytes.buffer], { type: source.mime }), name);
  if (info) form.append('fileInfo', JSON.stringify(info));
  return form;
}
