import { createHash, createHmac } from 'crypto';

export interface SigningOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

let sha256 = (data: string): string => {
  return createHash('sha256').update(data).digest('hex');
};

let hmacSha256 = (key: string | Uint8Array, data: string): Uint8Array => {
  let hmac = createHmac('sha256', key);
  hmac.update(data);
  return new Uint8Array(hmac.digest());
};

let hmacSha256Hex = (key: string | Uint8Array, data: string): string => {
  let hmac = createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
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

let getAmzDate = (): { amzDate: string; dateStamp: string } => {
  let now = new Date();
  let amzDate = `${now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, '')
    .slice(0, 15)}Z`;
  let dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
};

let buildCanonicalQueryString = (queryString: string): string => {
  if (!queryString) return '';
  let params = queryString.split('&').map(p => {
    let [key, ...rest] = p.split('=');
    let value = rest.join('=');
    return { key: key || '', value: value || '' };
  });
  params.sort((a, b) => a.key.localeCompare(b.key) || a.value.localeCompare(b.value));
  return params.map(p => `${uriEncode(p.key)}=${uriEncode(p.value)}`).join('&');
};

let buildCanonicalHeaders = (
  headers: Record<string, string>
): { canonicalHeaders: string; signedHeaders: string } => {
  let entries = Object.entries(headers)
    .map(([k, v]) => [k.toLowerCase().trim(), v.trim()] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));

  let canonicalHeaders = `${entries.map(([k, v]) => `${k}:${v}`).join('\n')}\n`;
  let signedHeaders = entries.map(([k]) => k).join(';');
  return { canonicalHeaders, signedHeaders };
};

export let signRequest = (options: SigningOptions): Record<string, string> => {
  let {
    method,
    url,
    headers,
    body,
    region,
    service,
    accessKeyId,
    secretAccessKey,
    sessionToken
  } = options;

  let { amzDate, dateStamp } = getAmzDate();

  let parsedUrl = new URL(url);
  let canonicalUri = uriEncode(parsedUrl.pathname, false) || '/';
  let canonicalQueryString = buildCanonicalQueryString(parsedUrl.search.slice(1));

  let headersToSign: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    'x-amz-date': amzDate
  };

  if (sessionToken) {
    headersToSign['x-amz-security-token'] = sessionToken;
  }

  let payloadHash = sha256(body);
  headersToSign['x-amz-content-sha256'] = payloadHash;

  let { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headersToSign);

  let canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  let stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  let signingKey = hmacSha256(
    hmacSha256(hmacSha256(hmacSha256(`AWS4${secretAccessKey}`, dateStamp), region), service),
    'aws4_request'
  );

  let signature = hmacSha256Hex(signingKey, stringToSign);

  let authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let resultHeaders: Record<string, string> = {
    Authorization: authorization,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash
  };

  if (sessionToken) {
    resultHeaders['x-amz-security-token'] = sessionToken;
  }

  return resultHeaders;
};
