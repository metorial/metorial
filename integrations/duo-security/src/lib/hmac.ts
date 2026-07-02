// HMAC-SHA1 signing for Duo Security API authentication
// Implements the canonical request signing as specified by Duo's API docs

export let encodeRfc3986 = (str: string): string => {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
};

export let canonicalizeParams = (params: Record<string, string>): string => {
  let keys = Object.keys(params).sort();
  let pairs = keys.map(key => `${encodeRfc3986(key)}=${encodeRfc3986(params[key] ?? '')}`);
  return pairs.join('&');
};

export let buildCanonicalString = (
  date: string,
  method: string,
  host: string,
  path: string,
  params: Record<string, string>
): string => {
  return [
    date,
    method.toUpperCase(),
    host.toLowerCase(),
    path,
    canonicalizeParams(params)
  ].join('\n');
};

export let hmacSha1Hex = async (key: string, message: string): Promise<string> => {
  let encoder = new TextEncoder();
  let keyData = encoder.encode(key);
  let messageData = encoder.encode(message);

  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  let signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  let bytes = new Uint8Array(signature);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export let getRfc2822Date = (): string => {
  let now = new Date();
  let days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];

  let pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

  let dayName = days[now.getUTCDay()];
  let day = pad(now.getUTCDate());
  let month = months[now.getUTCMonth()];
  let year = now.getUTCFullYear();
  let hours = pad(now.getUTCHours());
  let minutes = pad(now.getUTCMinutes());
  let seconds = pad(now.getUTCSeconds());

  return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
};

export let signRequest = async (params: {
  integrationKey: string;
  secretKey: string;
  apiHostname: string;
  method: string;
  path: string;
  params: Record<string, string>;
}): Promise<{ authorization: string; date: string }> => {
  let date = getRfc2822Date();
  let canonical = buildCanonicalString(
    date,
    params.method,
    params.apiHostname,
    params.path,
    params.params
  );

  let hmac = await hmacSha1Hex(params.secretKey, canonical);
  let authString = `${params.integrationKey}:${hmac}`;
  let authorization = `Basic ${btoa(authString)}`;

  return { authorization, date };
};
