// Ghost Admin API JWT generation
// Admin API keys are formatted as {id}:{secret}
// The JWT uses HS256 with the secret decoded from hex

let hexToBytes = (hex: string): Uint8Array => {
  let bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

let base64UrlEncode = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let base64UrlEncodeBytes = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
};

let hmacSha256 = async (key: Uint8Array, message: string): Promise<Uint8Array> => {
  let cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  let messageBytes = new TextEncoder().encode(message);
  let signature = await crypto.subtle.sign('HMAC', cryptoKey, toArrayBuffer(messageBytes));
  return new Uint8Array(signature);
};

export let generateGhostJwt = async (apiKey: string): Promise<string> => {
  // Staff access tokens are used directly as the JWT (they don't contain a colon)
  if (!apiKey.includes(':')) {
    return apiKey;
  }

  let parts = apiKey.split(':');
  let id = parts[0]!;
  let secret = parts[1]!;

  let header = {
    alg: 'HS256',
    kid: id,
    typ: 'JWT'
  };

  let now = Math.floor(Date.now() / 1000);
  let payload = {
    iat: now,
    exp: now + 5 * 60,
    aud: '/admin/'
  };

  let headerB64 = base64UrlEncode(JSON.stringify(header));
  let payloadB64 = base64UrlEncode(JSON.stringify(payload));
  let signingInput = `${headerB64}.${payloadB64}`;

  let keyBytes = hexToBytes(secret);
  let signatureBytes = await hmacSha256(keyBytes, signingInput);
  let signatureB64 = base64UrlEncodeBytes(signatureBytes);

  return `${signingInput}.${signatureB64}`;
};
