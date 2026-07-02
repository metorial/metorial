import { createHash, randomBytes } from 'node:crypto';
import { mongodbServiceError } from './errors';

export type DigestChallenge = {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
};

let md5 = (input: string) => createHash('md5').update(input, 'utf8').digest('hex');

let quote = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

let chooseQop = (qop?: string) => {
  if (!qop) return undefined;

  let options = qop.split(',').map(option => option.trim().toLowerCase());
  return options.includes('auth') ? 'auth' : undefined;
};

export let parseDigestChallenge = (header: string): DigestChallenge | undefined => {
  if (!header.toLowerCase().startsWith('digest ')) return undefined;

  let params: Record<string, string> = {};
  let rest = header.slice(7);
  let regex = /(\w+)=(?:"([^"]*)"|([^,\s]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rest))) {
    params[match[1]!] = match[2] ?? match[3] ?? '';
  }

  if (!params.realm || !params.nonce) return undefined;

  return {
    realm: params.realm,
    nonce: params.nonce,
    qop: params.qop,
    opaque: params.opaque,
    algorithm: params.algorithm
  };
};

export let buildDigestHeader = (params: {
  method: string;
  uri: string;
  username: string;
  password: string;
  challenge: DigestChallenge;
}) => {
  let nc = '00000001';
  let cnonce = randomBytes(16).toString('hex');
  let algorithm = params.challenge.algorithm || 'MD5';

  if (!['MD5', 'MD5-sess'].includes(algorithm)) {
    throw mongodbServiceError(`Unsupported digest algorithm: ${algorithm}`);
  }

  let ha1 = md5(`${params.username}:${params.challenge.realm}:${params.password}`);
  if (algorithm === 'MD5-sess') {
    ha1 = md5(`${ha1}:${params.challenge.nonce}:${cnonce}`);
  }

  let ha2 = md5(`${params.method}:${params.uri}`);
  let qop = chooseQop(params.challenge.qop);
  let response = qop
    ? md5(`${ha1}:${params.challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${params.challenge.nonce}:${ha2}`);

  let parts = [
    `Digest username="${quote(params.username)}"`,
    `realm="${quote(params.challenge.realm)}"`,
    `nonce="${quote(params.challenge.nonce)}"`,
    `uri="${quote(params.uri)}"`,
    `response="${response}"`
  ];

  if (qop) {
    parts.push(`qop=${qop}`);
    parts.push(`nc=${nc}`);
    parts.push(`cnonce="${cnonce}"`);
  }

  if (params.challenge.opaque) {
    parts.push(`opaque="${quote(params.challenge.opaque)}"`);
  }

  if (params.challenge.algorithm) {
    parts.push(`algorithm=${params.challenge.algorithm}`);
  }

  return parts.join(', ');
};
