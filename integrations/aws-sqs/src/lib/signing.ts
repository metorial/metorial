import crypto from 'crypto';

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface SignedRequestOptions {
  method: string;
  url: string;
  region: string;
  service: string;
  credentials: AwsCredentials;
  headers?: Record<string, string>;
  body?: string;
}

let sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

let hmacSha256 = (key: string | Uint8Array, data: string): Uint8Array => {
  return crypto.createHmac('sha256', key).update(data).digest();
};

let hmacSha256Hex = (key: Uint8Array, data: string): string => {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
};

let uriEncode = (str: string): string => {
  return encodeURIComponent(str).replace(/%2F/g, '/');
};

let getDateStrings = (date: Date): { dateStamp: string; amzDate: string } => {
  let iso = date
    .toISOString()
    .replace(/[:-]/g, '')
    .replace(/\.\d{3}/, '');
  let dateStamp = iso.substring(0, 8);
  let amzDate = `${iso.substring(0, 15)}Z`;
  return { dateStamp, amzDate };
};

export let signRequest = (options: SignedRequestOptions): Record<string, string> => {
  let { method, url, region, service, credentials, headers = {}, body = '' } = options;

  let parsedUrl = new URL(url);
  let host = parsedUrl.hostname;
  let canonicalUri = parsedUrl.pathname || '/';
  let now = new Date();
  let { dateStamp, amzDate } = getDateStrings(now);

  let allHeaders: Record<string, string> = {
    ...headers,
    host,
    'x-amz-date': amzDate
  };

  if (credentials.sessionToken) {
    allHeaders['x-amz-security-token'] = credentials.sessionToken;
  }

  // Build canonical query string
  let queryParams = Array.from(parsedUrl.searchParams.entries());
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));
  let canonicalQueryString = queryParams
    .map(([key, value]) => `${uriEncode(key)}=${uriEncode(value)}`)
    .join('&');

  // Build canonical headers (sorted, lowercase)
  let headerKeys = Object.keys(allHeaders).map(k => k.toLowerCase());
  headerKeys.sort();
  let canonicalHeaders = `${headerKeys
    .map(
      key =>
        `${key}:${allHeaders[Object.keys(allHeaders).find(k => k.toLowerCase() === key)!]!.trim()}`
    )
    .join('\n')}\n`;
  let signedHeaders = headerKeys.join(';');

  let payloadHash = sha256(body);

  let canonicalRequest = [
    method.toUpperCase(),
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

  // Derive signing key
  let kDate = hmacSha256(`AWS4${credentials.secretAccessKey}`, dateStamp);
  let kRegion = hmacSha256(kDate, region);
  let kService = hmacSha256(kRegion, service);
  let kSigning = hmacSha256(kService, 'aws4_request');

  let signature = hmacSha256Hex(kSigning, stringToSign);

  let authorizationHeader = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let resultHeaders: Record<string, string> = {
    ...headers,
    'x-amz-date': amzDate,
    Authorization: authorizationHeader
  };

  if (credentials.sessionToken) {
    resultHeaders['x-amz-security-token'] = credentials.sessionToken;
  }

  return resultHeaders;
};
