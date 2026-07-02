// AWS Signature Version 4 signing implementation
// Uses Web Crypto API (SubtleCrypto) for HMAC-SHA256 operations

let encoder = new TextEncoder();

let toHex = (buffer: ArrayBuffer): string => {
  let bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] as number).toString(16).padStart(2, '0');
  }
  return hex;
};

let sha256 = async (data: string): Promise<string> => {
  let hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(hash);
};

let hmacSha256 = async (key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> => {
  let keyBuffer = key instanceof Uint8Array ? (key.buffer as ArrayBuffer) : key;
  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  let dataBuffer = encoder.encode(data);
  return crypto.subtle.sign('HMAC', cryptoKey, dataBuffer.buffer as ArrayBuffer);
};

let getSigningKey = async (
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> => {
  let kDate = await hmacSha256(encoder.encode(`AWS4${secretKey}`), dateStamp);
  let kRegion = await hmacSha256(kDate, region);
  let kService = await hmacSha256(kRegion, service);
  let kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
};

export interface SignRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service: string;
}

export interface SignedHeaders {
  [key: string]: string;
}

export let signRequest = async (params: SignRequestParams): Promise<SignedHeaders> => {
  let {
    method,
    url,
    headers,
    body,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    service
  } = params;

  let parsedUrl = new URL(url);
  let now = new Date();
  let dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8); // YYYYMMDD
  let amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, ''); // YYYYMMDDTHHMMSSZ

  let allHeaders: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    'x-amz-date': amzDate
  };

  if (sessionToken) {
    allHeaders['x-amz-security-token'] = sessionToken;
  }

  // Create canonical headers (sorted, lowercased keys, trimmed values)
  let sortedHeaderKeys = Object.keys(allHeaders)
    .map(k => k.toLowerCase())
    .sort();

  let canonicalHeaders = sortedHeaderKeys
    .map(key => {
      let originalKey = Object.keys(allHeaders).find(k => k.toLowerCase() === key) as string;
      return `${key}:${(allHeaders[originalKey] as string).trim()}\n`;
    })
    .join('');

  let signedHeaders = sortedHeaderKeys.join(';');

  // Hash the payload
  let payloadHash = await sha256(body || '');

  // Create canonical URI (percent-encode path segments)
  let canonicalUri = parsedUrl.pathname || '/';

  // Create canonical query string (sorted by key)
  let queryParams = Array.from(parsedUrl.searchParams.entries());
  queryParams.sort((a, b) => {
    if (a[0] === b[0]) return a[1].localeCompare(b[1]);
    return a[0].localeCompare(b[0]);
  });
  let canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Create canonical request
  let canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // Create string to sign
  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  let canonicalRequestHash = await sha256(canonicalRequest);
  let stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n'
  );

  // Derive signing key and calculate signature
  let signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  let signatureBuffer = await hmacSha256(signingKey, stringToSign);
  let signature = toHex(signatureBuffer);

  // Build authorization header
  let authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let result: SignedHeaders = {
    ...allHeaders,
    Authorization: authorization
  };

  return result;
};
