import { braintreeServiceError } from './errors';
import { parseXml } from './xml';

/**
 * Verifies a Braintree webhook signature and parses the payload.
 * Braintree webhooks are sent as form-encoded POST with bt_signature and bt_payload.
 * The payload is base64-encoded XML.
 */
export let verifyAndParseWebhook = (params: {
  btSignature: string;
  btPayload: string;
  publicKey: string;
  privateKey: string;
}): { kind: string; timestamp: string; subject: Record<string, any> } => {
  let { btSignature, btPayload, publicKey, privateKey } = params;

  // Verify signature
  let signaturePairs = btSignature.split('&');
  let matchingPair = signaturePairs.find(pair => {
    let [key] = pair.split('|');
    return key === publicKey;
  });

  if (!matchingPair) {
    throw braintreeServiceError('No matching signature found for the configured public key');
  }

  let signature = matchingPair.split('|')[1] || '';

  // The payload should only contain valid base64 characters
  let cleanPayload = btPayload.replace(/\s/g, '');

  // Verify HMAC-SHA1 - we need to compute the HMAC and compare
  // For webhook verification we use the private key as the HMAC key
  let expectedSignature = hmacSha1(privateKey, cleanPayload);

  // Also try with newline appended (Braintree SDK does this)
  let expectedSignatureWithNewline = hmacSha1(privateKey, `${cleanPayload}\n`);

  if (
    !secureCompare(signature, expectedSignature) &&
    !secureCompare(signature, expectedSignatureWithNewline)
  ) {
    throw braintreeServiceError('Webhook signature verification failed');
  }

  // Decode and parse payload
  let xml = atob(cleanPayload);
  let parsed = parseXml(xml);
  let notification = parsed.notification || parsed;

  return {
    kind: notification.kind || '',
    timestamp: notification.timestamp || '',
    subject: notification.subject || notification
  };
};

/**
 * Generate a webhook challenge response.
 * When Braintree sends a GET with bt_challenge, respond with publicKey|hmac(privateKey, challenge).
 */
export let generateChallengeResponse = (params: {
  challenge: string;
  publicKey: string;
  privateKey: string;
}): string => {
  let digest = hmacSha1(params.privateKey, params.challenge);
  return `${params.publicKey}|${digest}`;
};

/**
 * HMAC-SHA1 implementation using Web Crypto API.
 * Returns hex-encoded digest.
 */
let hmacSha1 = (key: string, message: string): string => {
  // Simple HMAC-SHA1 implementation
  // Since we're in a Node.js environment, we can use the crypto module
  // But to stay compatible, let's implement it using available primitives
  let sha1 = sha1Hash;

  let blockSize = 64;
  let keyBytes = stringToBytes(key);

  if (keyBytes.length > blockSize) {
    keyBytes = sha1(keyBytes);
  }

  while (keyBytes.length < blockSize) {
    keyBytes = new Uint8Array([...keyBytes, 0]);
  }

  let ipad = new Uint8Array(blockSize);
  let opad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    ipad[i] = (keyBytes[i] as number) ^ 0x36;
    opad[i] = (keyBytes[i] as number) ^ 0x5c;
  }

  let messageBytes = stringToBytes(message);
  let inner = sha1(concatBytes(ipad, messageBytes));
  let outer = sha1(concatBytes(opad, inner));

  return bytesToHex(outer);
};

let stringToBytes = (str: string): Uint8Array => {
  let bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
};

let bytesToHex = (bytes: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] as number).toString(16).padStart(2, '0');
  }
  return hex;
};

let concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  let result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
};

/**
 * SHA-1 hash implementation.
 */
let sha1Hash = (message: Uint8Array): Uint8Array => {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  let msgLen = message.length;
  let bitLen = msgLen * 8;

  // Pre-processing: adding padding bits
  let paddingLen = (56 - ((msgLen + 1) % 64) + 64) % 64;
  let padded = new Uint8Array(msgLen + 1 + paddingLen + 8);
  padded.set(message);
  padded[msgLen] = 0x80;

  // Append length as 64-bit big-endian
  let lenHigh = Math.floor(bitLen / 0x100000000);
  let lenLow = bitLen >>> 0;
  let pLen = padded.length;
  padded[pLen - 8] = (lenHigh >>> 24) & 0xff;
  padded[pLen - 7] = (lenHigh >>> 16) & 0xff;
  padded[pLen - 6] = (lenHigh >>> 8) & 0xff;
  padded[pLen - 5] = lenHigh & 0xff;
  padded[pLen - 4] = (lenLow >>> 24) & 0xff;
  padded[pLen - 3] = (lenLow >>> 16) & 0xff;
  padded[pLen - 2] = (lenLow >>> 8) & 0xff;
  padded[pLen - 1] = lenLow & 0xff;

  // Helper to safely read from typed arrays
  let p = (idx: number): number => padded[idx]!;
  let wGet = (arr: number[], idx: number): number => arr[idx]!;

  // Process each 512-bit block
  let blocks = padded.length / 64;
  for (let block = 0; block < blocks; block++) {
    let w: number[] = new Array(80).fill(0);
    let offset = block * 64;

    for (let i = 0; i < 16; i++) {
      w[i] =
        (p(offset + i * 4) << 24) |
        (p(offset + i * 4 + 1) << 16) |
        (p(offset + i * 4 + 2) << 8) |
        p(offset + i * 4 + 3);
    }

    for (let i = 16; i < 80; i++) {
      w[i] = rotateLeft(
        wGet(w, i - 3) ^ wGet(w, i - 8) ^ wGet(w, i - 14) ^ wGet(w, i - 16),
        1
      );
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      let temp = (rotateLeft(a, 5) + f + e + k + wGet(w, i)) & 0xffffffff;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) & 0xffffffff;
    h1 = (h1 + b) & 0xffffffff;
    h2 = (h2 + c) & 0xffffffff;
    h3 = (h3 + d) & 0xffffffff;
    h4 = (h4 + e) & 0xffffffff;
  }

  let result = new Uint8Array(20);
  let hashes = [h0, h1, h2, h3, h4];
  for (let i = 0; i < 5; i++) {
    let h = hashes[i]!;
    result[i * 4] = (h >>> 24) & 0xff;
    result[i * 4 + 1] = (h >>> 16) & 0xff;
    result[i * 4 + 2] = (h >>> 8) & 0xff;
    result[i * 4 + 3] = h & 0xff;
  }

  return result;
};

let rotateLeft = (n: number, s: number): number => {
  return ((n << s) | (n >>> (32 - s))) & 0xffffffff;
};

/**
 * Constant-time string comparison to prevent timing attacks.
 */
let secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};
