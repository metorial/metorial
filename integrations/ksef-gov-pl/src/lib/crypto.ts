import {
  constants,
  createCipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
  randomBytes,
  X509Certificate
} from 'node:crypto';
import type { KsefPublicCertificate } from './certificates';
import { ksefValidationError } from './errors';

export type KsefEncryptedInvoice = {
  encryptedInvoice: Buffer;
  encryptedSymmetricKey: string;
  initializationVector: string;
  invoiceHash: string;
  invoiceSize: number;
  encryptedInvoiceHash: string;
  encryptedInvoiceSize: number;
};

function publicKey(certificate: KsefPublicCertificate) {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(certificate.certificate, 'base64');
    if (!bytes.length) throw new TypeError('Empty certificate');
    try {
      return new X509Certificate(bytes).publicKey;
    } catch {
      return createPublicKey({ key: bytes, format: 'der', type: 'spki' });
    }
  } catch {
    throw ksefValidationError('KSeF returned an unusable encryption certificate.');
  }
}

export function encryptRsaOaepSha256(
  bytes: Uint8Array,
  certificate: KsefPublicCertificate
): string {
  try {
    return publicEncrypt(
      {
        key: publicKey(certificate),
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(bytes)
    ).toString('base64');
  } catch (error) {
    if (error instanceof Error && error.name === 'ServiceError') throw error;
    throw ksefValidationError('Could not encrypt data with the current KSeF certificate.');
  }
}

function sha256Base64(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('base64');
}

export function encryptInvoice(
  invoice: Buffer,
  certificate: KsefPublicCertificate
): KsefEncryptedInvoice {
  const key = randomBytes(32);
  const iv = randomBytes(16);
  try {
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encryptedInvoice = Buffer.concat([cipher.update(invoice), cipher.final()]);
    return {
      encryptedInvoice,
      encryptedSymmetricKey: encryptRsaOaepSha256(key, certificate),
      initializationVector: iv.toString('base64'),
      invoiceHash: sha256Base64(invoice),
      invoiceSize: invoice.byteLength,
      encryptedInvoiceHash: sha256Base64(encryptedInvoice),
      encryptedInvoiceSize: encryptedInvoice.byteLength
    };
  } finally {
    key.fill(0);
    iv.fill(0);
  }
}
