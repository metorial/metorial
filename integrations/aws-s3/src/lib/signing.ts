// AWS Signature Version 4 signing implementation

let hexEncode = (data: Uint8Array): string => {
  return Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

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

let hmacSha256 = async (
  key: ArrayBuffer | Uint8Array,
  message: string
): Promise<ArrayBuffer> => {
  let normalizedKey = key instanceof Uint8Array ? toArrayBuffer(key) : key;
  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    normalizedKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, toArrayBuffer(textEncoder.encode(message)));
};

let sha256 = async (data: string | Uint8Array): Promise<string> => {
  let input = typeof data === 'string' ? textEncoder.encode(data) : data;
  let hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(input));
  return hexEncode(new Uint8Array(hash));
};

let getSigningKey = async (
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> => {
  let kDate = await hmacSha256(textEncoder.encode(`AWS4${secretKey}`), dateStamp);
  let kRegion = await hmacSha256(kDate, region);
  let kService = await hmacSha256(kRegion, service);
  let kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
};

let formatDate = (date: Date): { dateStamp: string; amzDate: string } => {
  let iso = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return {
    dateStamp: iso.slice(0, 8),
    amzDate: iso
  };
};

let uriEncode = (str: string, encodeSlash: boolean = true): string => {
  let encoded = '';
  for (let i = 0; i < str.length; i++) {
    let ch = str[i]!;
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' ||
      ch === '-' ||
      ch === '~' ||
      ch === '.'
    ) {
      encoded += ch;
    } else if (ch === '/' && !encodeSlash) {
      encoded += ch;
    } else {
      let bytes = textEncoder.encode(ch);
      for (let b of bytes) {
        encoded += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return encoded;
};

export interface SignRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | Uint8Array;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service?: string;
}

export let signRequest = async (
  params: SignRequestParams
): Promise<Record<string, string>> => {
  let {
    method,
    url,
    headers,
    body,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    service = 's3'
  } = params;

  let parsedUrl = new URL(url);
  let now = new Date();
  let { dateStamp, amzDate } = formatDate(now);

  let signedHeaders = { ...headers };
  signedHeaders['x-amz-date'] = amzDate;
  signedHeaders.host = parsedUrl.host;

  if (sessionToken) {
    signedHeaders['x-amz-security-token'] = sessionToken;
  }

  let bodyContent = body || '';
  let payloadHash: string;
  if (signedHeaders['x-amz-content-sha256'] === 'UNSIGNED-PAYLOAD') {
    payloadHash = 'UNSIGNED-PAYLOAD';
  } else {
    payloadHash =
      typeof bodyContent === 'string' ? await sha256(bodyContent) : await sha256(bodyContent);
  }
  signedHeaders['x-amz-content-sha256'] = payloadHash;

  // Build canonical request
  let canonicalUri = uriEncode(decodeURIComponent(parsedUrl.pathname), false) || '/';

  // Sort query parameters
  let queryParams = Array.from(parsedUrl.searchParams.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  let canonicalQueryString = queryParams
    .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
    .join('&');

  // Sort and build canonical headers
  let headerKeys = Object.keys(signedHeaders)
    .map(k => k.toLowerCase())
    .sort();
  let canonicalHeaders = `${headerKeys
    .map(
      k =>
        `${k}:${signedHeaders[Object.keys(signedHeaders).find(h => h.toLowerCase() === k)!]!.trim()}`
    )
    .join('\n')}\n`;
  let signedHeadersStr = headerKeys.join(';');

  let canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash
  ].join('\n');

  // Build string to sign
  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  let canonicalRequestHash = await sha256(canonicalRequest);
  let stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n'
  );

  // Calculate signature
  let signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  let signatureBytes = await hmacSha256(signingKey, stringToSign);
  let signature = hexEncode(new Uint8Array(signatureBytes));

  // Build authorization header
  let authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  let resultHeaders: Record<string, string> = {};
  for (let key of Object.keys(signedHeaders)) {
    resultHeaders[key] = signedHeaders[key]!;
  }
  resultHeaders.Authorization = authorization;

  return resultHeaders;
};

export interface PresignParams {
  method: string;
  url: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  expiresInSeconds?: number;
  service?: string;
}

export let createPresignedUrl = async (params: PresignParams): Promise<string> => {
  let {
    method,
    url,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    expiresInSeconds = 3600,
    service = 's3'
  } = params;

  let parsedUrl = new URL(url);
  let now = new Date();
  let { dateStamp, amzDate } = formatDate(now);
  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  parsedUrl.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  parsedUrl.searchParams.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
  parsedUrl.searchParams.set('X-Amz-Date', amzDate);
  parsedUrl.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
  parsedUrl.searchParams.set('X-Amz-SignedHeaders', 'host');

  if (sessionToken) {
    parsedUrl.searchParams.set('X-Amz-Security-Token', sessionToken);
  }

  let canonicalUri = uriEncode(decodeURIComponent(parsedUrl.pathname), false) || '/';

  let queryParams = Array.from(parsedUrl.searchParams.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  let canonicalQueryString = queryParams
    .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
    .join('&');

  let canonicalHeaders = `host:${parsedUrl.host}\n`;
  let signedHeadersStr = 'host';

  let canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersStr,
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  let canonicalRequestHash = await sha256(canonicalRequest);
  let stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join(
    '\n'
  );

  let signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  let signatureBytes = await hmacSha256(signingKey, stringToSign);
  let signature = hexEncode(new Uint8Array(signatureBytes));

  parsedUrl.searchParams.set('X-Amz-Signature', signature);

  return parsedUrl.toString();
};
