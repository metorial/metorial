import { createPrivateKey, createPublicKey, randomUUID, sign } from 'node:crypto';
import { id, invalid } from './validation';
export function rsaPrivateKey(value: string) {
  try {
    if (
      typeof value !== 'string' ||
      value.length > 16384 ||
      !/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(value)
    )
      throw invalid('Provide the RSA private key contents.');
    const key = createPrivateKey(value);
    if (
      key.asymmetricKeyType !== 'rsa' ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    )
      throw invalid('Use an RSA private key of at least 2048 bits.');
    return key;
  } catch {
    throw invalid(
      'Provide an unencrypted RSA private key of at least 2048 bits in PKCS#1 or PKCS#8 PEM format.'
    );
  }
}
export function rsaPublicKey(value: string) {
  try {
    if (
      typeof value !== 'string' ||
      value.length > 16384 ||
      !value.startsWith('-----BEGIN PUBLIC KEY-----')
    )
      throw invalid('Provide a public key.');
    const key = createPublicKey(value);
    if (
      key.asymmetricKeyType !== 'rsa' ||
      (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    )
      throw invalid('Provide an RSA public key.');
    return key.export({ type: 'spki', format: 'pem' }).toString();
  } catch {
    throw invalid(
      'Provide the RSA public key from a saved keypair of at least 2048 bits. Keep the matching private key securely.'
    );
  }
}
export async function generateVonageJwt(
  applicationId: string,
  privateKey: string
): Promise<string> {
  id(applicationId);
  const key = rsaPrivateKey(privateKey),
    now = Math.floor(Date.now() / 1000);
  const encoded = [
    { alg: 'RS256', typ: 'JWT' },
    { application_id: applicationId, iat: now, exp: now + 900, jti: randomUUID() }
  ]
    .map(value => Buffer.from(JSON.stringify(value)).toString('base64url'))
    .join('.');
  try {
    return `${encoded}.${sign('RSA-SHA256', Buffer.from(encoded), key).toString('base64url')}`;
  } catch {
    throw invalid(
      'The application private key could not sign a request. Reconnect with its matching unencrypted RSA key.'
    );
  }
}
