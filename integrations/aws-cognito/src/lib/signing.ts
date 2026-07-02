// AWS Signature Version 4 signing implementation using Web Crypto API

let textEncoder = new TextEncoder();

let toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  if (
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength &&
    bytes.buffer instanceof ArrayBuffer
  ) {
    return bytes.buffer;
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
};

let hexEncode = (bytes: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
};

let sha256 = async (data: string | Uint8Array): Promise<Uint8Array> => {
  let input = typeof data === 'string' ? textEncoder.encode(data) : data;
  let hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(input));
  return new Uint8Array(hash);
};

let hmacSha256 = async (key: Uint8Array, data: string): Promise<Uint8Array> => {
  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  let sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    toArrayBuffer(textEncoder.encode(data))
  );
  return new Uint8Array(sig);
};

let getDateStamp = (date: Date): string => {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 8);
};

let getAmzDate = (date: Date): string => {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
};

let getSigningKey = async (
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> => {
  let kDate = await hmacSha256(textEncoder.encode(`AWS4${secretKey}`), dateStamp);
  let kRegion = await hmacSha256(kDate, region);
  let kService = await hmacSha256(kRegion, service);
  let kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
};

export interface SignRequestParams {
  method: string;
  host: string;
  path: string;
  region: string;
  service: string;
  headers: Record<string, string>;
  body: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export let signRequest = async (
  params: SignRequestParams
): Promise<Record<string, string>> => {
  let now = new Date();
  let dateStamp = getDateStamp(now);
  let amzDate = getAmzDate(now);

  let headers: Record<string, string> = {
    ...params.headers,
    host: params.host,
    'x-amz-date': amzDate
  };

  if (params.sessionToken) {
    headers['x-amz-security-token'] = params.sessionToken;
  }

  let payloadHash = hexEncode(await sha256(params.body));

  let sortedHeaderKeys = Object.keys(headers).sort();
  let canonicalHeaders = `${sortedHeaderKeys.map(k => `${k.toLowerCase()}:${headers[k]!.trim()}`).join('\n')}\n`;
  let signedHeaders = sortedHeaderKeys.map(k => k.toLowerCase()).join(';');

  let canonicalRequest = [
    params.method,
    params.path,
    '', // empty query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  let credentialScope = `${dateStamp}/${params.region}/${params.service}/aws4_request`;
  let canonicalRequestHash = hexEncode(await sha256(canonicalRequest));

  let stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n'
  );

  let signingKey = await getSigningKey(
    params.secretAccessKey,
    dateStamp,
    params.region,
    params.service
  );
  let signature = hexEncode(await hmacSha256(signingKey, stringToSign));

  let authorizationHeader = `AWS4-HMAC-SHA256 Credential=${params.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let result: Record<string, string> = {
    ...headers,
    Authorization: authorizationHeader
  };

  return result;
};
