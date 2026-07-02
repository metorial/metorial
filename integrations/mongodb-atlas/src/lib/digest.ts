// HTTP Digest Authentication helper for MongoDB Atlas API Keys
// Implements RFC 2617 Digest Access Authentication

let generateCnonce = (): string => {
  let array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

let md5 = async (input: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(input);
  let hashBuffer = await crypto.subtle.digest('MD5', data);
  let hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
}

export let parseDigestChallenge = (header: string): DigestChallenge | null => {
  if (!header.toLowerCase().startsWith('digest ')) {
    return null;
  }

  let params: Record<string, string> = {};
  let rest = header.substring(7);
  let regex = /(\w+)=(?:"([^"]*)"|([\w]+))/g;
  let match: any;

  while ((match = regex.exec(rest)) !== null) {
    params[match[1]!] = match[2] ?? match[3] ?? '';
  }

  if (!params.realm || !params.nonce) {
    return null;
  }

  return {
    realm: params.realm,
    nonce: params.nonce,
    qop: params.qop,
    opaque: params.opaque,
    algorithm: params.algorithm
  };
};

export let buildDigestHeader = async (
  method: string,
  uri: string,
  username: string,
  password: string,
  challenge: DigestChallenge
): Promise<string> => {
  let ncStr = '00000001';
  let cnonce = generateCnonce();

  let ha1 = await md5(`${username}:${challenge.realm}:${password}`);
  let ha2 = await md5(`${method}:${uri}`);

  let response: string;
  if (challenge.qop) {
    response = await md5(`${ha1}:${challenge.nonce}:${ncStr}:${cnonce}:auth:${ha2}`);
  } else {
    response = await md5(`${ha1}:${challenge.nonce}:${ha2}`);
  }

  let parts = [
    `Digest username="${username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`
  ];

  if (challenge.qop) {
    parts.push(`qop=auth`);
    parts.push(`nc=${ncStr}`);
    parts.push(`cnonce="${cnonce}"`);
  }

  if (challenge.opaque) {
    parts.push(`opaque="${challenge.opaque}"`);
  }

  if (challenge.algorithm) {
    parts.push(`algorithm=${challenge.algorithm}`);
  }

  return parts.join(', ');
};
