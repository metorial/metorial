import crypto from 'crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SignRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  region: string;
  service: string;
  credentials: AwsCredentials;
}

let hmacSha256 = (key: string | ArrayBuffer, data: string): ArrayBuffer => {
  let keyBuffer: ArrayBuffer;
  if (typeof key === 'string') {
    keyBuffer = new TextEncoder().encode(key).buffer as ArrayBuffer;
  } else {
    keyBuffer = key;
  }
  let hmac = crypto.createHmac('sha256', new Uint8Array(keyBuffer));
  hmac.update(data);
  let digest = hmac.digest();
  return digest.buffer.slice(
    digest.byteOffset,
    digest.byteOffset + digest.byteLength
  ) as ArrayBuffer;
};

let sha256Hex = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

let toHex = (buffer: ArrayBuffer): string => {
  let bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
};

let uriEncode = (str: string, encodeSlash: boolean = true): string => {
  let encoded = '';
  for (let i = 0; i < str.length; i++) {
    let ch = str[i]!;
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '-' ||
      ch === '_' ||
      ch === '.' ||
      ch === '~'
    ) {
      encoded += ch;
    } else if (ch === '/' && !encodeSlash) {
      encoded += ch;
    } else {
      let bytes = new TextEncoder().encode(ch);
      for (let b of bytes) {
        encoded += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return encoded;
};

export let signRequest = (params: SignRequestParams): Record<string, string> => {
  let { method, url, headers, body, region, service, credentials } = params;

  let parsedUrl = new URL(url);
  let now = new Date();
  let dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  let amzDate = `${dateStamp}T${now.toISOString().replace(/[-:]/g, '').slice(9, 15)}Z`;

  let signedHeaders: Record<string, string> = { ...headers };
  signedHeaders.host = parsedUrl.host;
  signedHeaders['x-amz-date'] = amzDate;

  if (credentials.sessionToken) {
    signedHeaders['x-amz-security-token'] = credentials.sessionToken;
  }

  let canonicalUri = uriEncode(decodeURIComponent(parsedUrl.pathname), false);

  let queryParams: [string, string][] = [];
  parsedUrl.searchParams.forEach((value, key) => {
    queryParams.push([key, value]);
  });
  queryParams.sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
  });
  let canonicalQueryString = queryParams
    .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
    .join('&');

  let headerKeys = Object.keys(signedHeaders)
    .map(k => k.toLowerCase())
    .sort();

  let canonicalHeaders = headerKeys
    .map(k => {
      let val =
        signedHeaders[Object.keys(signedHeaders).find(h => h.toLowerCase() === k)!] || '';
      return `${k}:${val.trim()}\n`;
    })
    .join('');

  let signedHeadersList = headerKeys.join(';');

  let payloadHash = sha256Hex(body || '');

  let canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeadersList,
    payloadHash
  ].join('\n');

  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  let stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  let dateKey = hmacSha256(`AWS4${credentials.secretAccessKey}`, dateStamp);
  let dateRegionKey = hmacSha256(dateKey, region);
  let dateRegionServiceKey = hmacSha256(dateRegionKey, service);
  let signingKey = hmacSha256(dateRegionServiceKey, 'aws4_request');

  let signature = toHex(hmacSha256(signingKey, stringToSign));

  let authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`;

  let result: Record<string, string> = {
    'x-amz-date': amzDate,
    authorization: authorization
  };

  if (credentials.sessionToken) {
    result['x-amz-security-token'] = credentials.sessionToken;
  }

  return result;
};
