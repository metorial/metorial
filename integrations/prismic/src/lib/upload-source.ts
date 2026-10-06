import { lookup } from 'node:dns/promises';
import { Agent } from 'node:https';
import { createAxios } from 'slates';
import { invalid, upstream, validText } from './contracts';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const publicV4 = (address: string): boolean => {
  const parts = address.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)
  )
    return false;
  const [a, b, c] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a! >= 224 ||
    (a === 100 && b! >= 64 && b! <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b! >= 16 && b! <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99) || (b === 0 && c === 2))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
};
// The shared HTTP surface supplies tracing/error mapping but no public-address
// resolver. Pin a validated address so DNS rebinding cannot change the target.
export async function fetchUploadSource(source: string): Promise<Buffer> {
  validText(source, 'file URL');
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return invalid('Provide a public HTTPS file URL.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443')
  )
    return invalid(
      'Provide a public HTTPS file URL without credentials, fragments or a custom port.'
    );
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(url.hostname, { all: true, family: 4 });
  } catch {
    return invalid('The upload source must resolve to a public IPv4 address.');
  }
  if (
    !Array.isArray(addresses) ||
    !addresses.length ||
    addresses.some(item => !publicV4(item.address))
  )
    return invalid('The upload source must resolve only to public IPv4 addresses.');
  const address = addresses[0]!.address;
  const agent = new Agent({
    lookup: (_hostname, _options, callback) => callback(null, address, 4)
  });
  try {
    const client = createAxios({
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: MAX_UPLOAD_BYTES,
      httpsAgent: agent,
      proxy: false
    });
    const response = await client.get<ArrayBuffer>(url.toString(), {
      responseType: 'arraybuffer'
    });
    const bytes = Buffer.from(response.data);
    if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES)
      return invalid('The upload file must contain between 1 byte and 4 MiB.');
    return bytes;
  } catch (error) {
    throw upstream(error);
  } finally {
    agent.destroy();
  }
}
