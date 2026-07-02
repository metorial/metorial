import crypto from 'crypto';

export interface AwsSignatureParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service: string;
}

let sha256 = (data: string): string => {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
};

let hmacSha256 = (key: string | Uint8Array, data: string): Uint8Array => {
  let hmac = crypto.createHmac('sha256', key);
  hmac.update(data, 'utf8');
  return new Uint8Array(hmac.digest());
};

let hmacSha256Hex = (key: string | Uint8Array, data: string): string => {
  let hmac = crypto.createHmac('sha256', key);
  hmac.update(data, 'utf8');
  return hmac.digest('hex');
};

let getDateStamp = (date: string): string => {
  return date.substring(0, 8);
};

let getAmzDate = (): string => {
  let now = new Date();
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
};

let buildCanonicalRequest = (
  method: string,
  canonicalUri: string,
  canonicalQueryString: string,
  canonicalHeaders: string,
  signedHeaders: string,
  payloadHash: string
): string => {
  return [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
};

let deriveSigningKey = (
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

export let signRequest = (params: AwsSignatureParams): Record<string, string> => {
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

  let amzDate = getAmzDate();
  let dateStamp = getDateStamp(amzDate);

  let parsedUrl = new URL(url);
  let canonicalUri = parsedUrl.pathname || '/';

  let queryParams = Array.from(parsedUrl.searchParams.entries());
  queryParams.sort((a, b) => {
    if (a[0] === b[0]) return a[1]!.localeCompare(b[1]!);
    return a[0]!.localeCompare(b[0]!);
  });
  let canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k!)}=${encodeURIComponent(v!)}`)
    .join('&');

  let allHeaders: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    'x-amz-date': amzDate
  };

  if (sessionToken) {
    allHeaders['x-amz-security-token'] = sessionToken;
  }

  let headerKeys = Object.keys(allHeaders)
    .map(k => k.toLowerCase())
    .sort();

  let canonicalHeaders = `${headerKeys
    .map(
      k =>
        `${k}:${allHeaders[Object.keys(allHeaders).find(h => h.toLowerCase() === k)!]!.trim()}`
    )
    .join('\n')}\n`;

  let signedHeaders = headerKeys.join(';');

  let payloadHash = sha256(body);

  let canonicalRequest = buildCanonicalRequest(
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  );

  let credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  let stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  let signingKey = deriveSigningKey(secretAccessKey, dateStamp, region, service);
  let signature = hmacSha256Hex(signingKey, stringToSign);

  let authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let signedRequestHeaders: Record<string, string> = {
    ...allHeaders,
    Authorization: authorizationHeader
  };

  return signedRequestHeaders;
};
