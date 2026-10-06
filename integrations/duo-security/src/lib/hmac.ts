import { createHash } from 'node:crypto';
import { createHmacSignature } from 'slates';
import { requireValue } from './contracts';
export const encodeRfc3986 = (value: string) => {
  requireValue(value.isWellFormed(), 'Provide well-formed Unicode text.');
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
};
export const canonicalizeParams = (params: Record<string, string>) =>
  Object.keys(params)
    .sort()
    .map(key => `${encodeRfc3986(key)}=${encodeRfc3986(params[key]!)}`)
    .join('&');
export const buildCanonicalString = (
  date: string,
  method: string,
  hostname: string,
  path: string,
  params: Record<string, string>
) =>
  [date, method.toUpperCase(), hostname.toLowerCase(), path, canonicalizeParams(params)].join(
    '\n'
  );
export const hmacSha1Hex = async (key: string, message: string) =>
  createHmacSignature({ secret: key, payload: message, algorithm: 'sha1', digest: 'hex' });
export const getRfc2822Date = () => new Date().toUTCString().replace('GMT', '+0000');
export const signRequest = async (params: {
  integrationKey: string;
  secretKey: string;
  apiHostname: string;
  method: string;
  path: string;
  params: Record<string, string>;
  version?: 'v2' | 'v5';
  body?: string;
  date?: string;
}) => {
  const date = params.date ?? getRfc2822Date(),
    version = params.version ?? 'v5';
  const hash = (text: string) => createHash('sha512').update(text).digest('hex');
  const canonical =
    version === 'v2'
      ? buildCanonicalString(
          date,
          params.method,
          params.apiHostname,
          params.path,
          params.params
        )
      : [
          date,
          params.method.toUpperCase(),
          params.apiHostname.toLowerCase(),
          params.path,
          canonicalizeParams(params.params),
          hash(params.body ?? ''),
          hash('')
        ].join('\n');
  const digest = createHmacSignature({
    secret: params.secretKey,
    payload: canonical,
    algorithm: version === 'v2' ? 'sha1' : 'sha512',
    digest: 'hex'
  });
  return {
    authorization: `Basic ${Buffer.from(`${params.integrationKey}:${digest}`).toString('base64')}`,
    date
  };
};
