import crypto from 'crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SignedRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  credentials: AwsCredentials;
  region: string;
  service: string;
}

let hmacSha256 = (key: string | Uint8Array, data: string): Uint8Array => {
  let hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return new Uint8Array(hmac.digest());
};

let sha256Hex = (data: string): string => {
  let hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
};

let toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

let getAmzDate = (): { amzDate: string; dateStamp: string } => {
  let now = new Date();
  let amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, '')
    .replace('Z', 'Z');
  let dateStamp = amzDate.substring(0, 8);
  return { amzDate, dateStamp };
};

let getSigningKey = (
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Uint8Array => {
  let kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  let kRegion = hmacSha256(kDate, region);
  let kService = hmacSha256(kRegion, service);
  let kSigning = hmacSha256(kService, 'aws4_request');
  return kSigning;
};

export let signRequest = (params: SignedRequestParams): Record<string, string> => {
  let { method, url, headers, body, credentials, region, service } = params;
  let { amzDate, dateStamp } = getAmzDate();

  let parsedUrl = new URL(url);
  let host = parsedUrl.host;
  let canonicalUri = parsedUrl.pathname || '/';

  let queryParams = Array.from(parsedUrl.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  let payloadHash = sha256Hex(body);

  let signedHeaders: Record<string, string> = {
    ...headers,
    host: host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash
  };

  if (credentials.sessionToken) {
    signedHeaders['x-amz-security-token'] = credentials.sessionToken;
  }

  let sortedHeaderKeys = Object.keys(signedHeaders)
    .map(k => k.toLowerCase())
    .sort();

  let canonicalHeaders = `${sortedHeaderKeys
    .map(
      k =>
        `${k}:${signedHeaders[Object.keys(signedHeaders).find(h => h.toLowerCase() === k)!]!.trim()}`
    )
    .join('\n')}\n`;

  let signedHeadersStr = sortedHeaderKeys.join(';');

  let canonicalRequest = [
    method,
    canonicalUri,
    queryParams,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash
  ].join('\n');

  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  let stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');

  let signingKey = getSigningKey(credentials.secretAccessKey, dateStamp, region, service);
  let signature = toHex(hmacSha256(signingKey, stringToSign));

  let authorizationHeader = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  let resultHeaders: Record<string, string> = {
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Authorization: authorizationHeader
  };

  if (credentials.sessionToken) {
    resultHeaders['x-amz-security-token'] = credentials.sessionToken;
  }

  return resultHeaders;
};
