// Vonage JWT generation utility
// JWTs are signed with RS256 (RSA-SHA256) using the application's private key

let base64UrlEncode = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let textToArrayBuffer = (text: string): ArrayBuffer => {
  let encoder = new TextEncoder();
  return encoder.encode(text).buffer as ArrayBuffer;
};

let pemToArrayBuffer = (pem: string): ArrayBuffer => {
  let b64 = pem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  let binaryString = atob(b64);
  let bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
};

let arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  let bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let generateJti = (): string => {
  let chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

export let generateVonageJwt = async (
  applicationId: string,
  privateKey: string
): Promise<string> => {
  let now = Math.floor(Date.now() / 1000);

  let header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  let payload = {
    application_id: applicationId,
    iat: now,
    jti: generateJti(),
    exp: now + 15 * 60, // 15 minutes TTL
    acl: {
      paths: {
        '/*/users/**': {},
        '/*/conversations/**': {},
        '/*/sessions/**': {},
        '/*/devices/**': {},
        '/*/image/**': {},
        '/*/media/**': {},
        '/*/applications/**': {},
        '/*/push/**': {},
        '/*/knocking/**': {},
        '/*/legs/**': {}
      }
    }
  };

  let headerEncoded = base64UrlEncode(JSON.stringify(header));
  let payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  let signingInput = `${headerEncoded}.${payloadEncoded}`;

  let keyData = pemToArrayBuffer(privateKey);
  let cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  let signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    textToArrayBuffer(signingInput)
  );

  let signatureEncoded = arrayBufferToBase64Url(signature);
  return `${signingInput}.${signatureEncoded}`;
};
