import { createApiServiceError } from 'slates';
import type { KsefEncryptedInvoice } from './crypto';
import { ksefValidationError } from './errors';

export interface PreparedSubmission {
  encrypted: KsefEncryptedInvoice;
  publicKeyId: string;
}

export interface OpenOnlineSessionRequest {
  formCode: {
    systemCode: 'FA (3)';
    schemaVersion: '1-0E';
    value: 'FA';
  };
  encryption: {
    encryptedSymmetricKey: string;
    initializationVector: string;
    publicKeyId: string;
  };
}

export interface SendOnlineInvoiceRequest {
  invoiceHash: string;
  invoiceSize: number;
  encryptedInvoiceHash: string;
  encryptedInvoiceSize: number;
  encryptedInvoiceContent: string;
  offlineMode: false;
}

export interface SubmissionLifecycle {
  prepare(forceRefresh: boolean): Promise<PreparedSubmission>;
  openSession(body: OpenOnlineSessionRequest): Promise<{
    referenceNumber: string;
    validUntil: string;
  }>;
  uploadInvoice(
    sessionReference: string,
    body: SendOnlineInvoiceRequest
  ): Promise<{ referenceNumber: string }>;
  closeSession(sessionReference: string): Promise<void>;
  isRetiredKeyError(error: unknown): boolean;
  isTransportError(error: unknown): boolean;
}

export interface SubmissionResult {
  sessionReference: string;
  invoiceReference: string;
  invoiceHash: string;
  invoiceSize: number;
  sessionValidUntil: string;
  sessionClosed: boolean;
  closureWarning?: string;
}

function openRequest(prepared: PreparedSubmission): OpenOnlineSessionRequest {
  return {
    formCode: { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' },
    encryption: {
      encryptedSymmetricKey: prepared.encrypted.encryptedSymmetricKey,
      initializationVector: prepared.encrypted.initializationVector,
      publicKeyId: prepared.publicKeyId
    }
  };
}

async function closeAfterFailure(
  lifecycle: SubmissionLifecycle,
  sessionReference: string
): Promise<void> {
  try {
    await lifecycle.closeSession(sessionReference);
  } catch {
    // Preserve the upload failure. The session reference is included in recovery errors.
  }
}

function ambiguousUploadError(sessionReference: string, invoiceHash: string) {
  const error = createApiServiceError(
    `The invoice upload outcome is unknown. Inspect session ${sessionReference} for invoice hash ${invoiceHash} before submitting it again.`,
    { reason: 'ksef_ambiguous_submission' }
  );
  error.data.sessionReferenceNumber = sessionReference;
  error.data.invoiceHash = invoiceHash;
  return error;
}

export async function submitOnlineInvoice(
  lifecycle: SubmissionLifecycle
): Promise<SubmissionResult> {
  let prepared = await lifecycle.prepare(false);
  let session: Awaited<ReturnType<SubmissionLifecycle['openSession']>>;

  try {
    session = await lifecycle.openSession(openRequest(prepared));
  } catch (error) {
    // A 21470 response definitively rejects this key before a session exists.
    if (!lifecycle.isRetiredKeyError(error)) throw error;
    prepared = await lifecycle.prepare(true);
    session = await lifecycle.openSession(openRequest(prepared));
  }

  if (!session?.referenceNumber) {
    throw ksefValidationError(
      'KSeF opened an online session without returning its reference. Inspect recent sessions before submitting this invoice again.'
    );
  }

  let sessionReference = session.referenceNumber;
  let encrypted = prepared.encrypted;
  let invoice: Awaited<ReturnType<SubmissionLifecycle['uploadInvoice']>>;

  try {
    invoice = await lifecycle.uploadInvoice(sessionReference, {
      invoiceHash: encrypted.invoiceHash,
      invoiceSize: encrypted.invoiceSize,
      encryptedInvoiceHash: encrypted.encryptedInvoiceHash,
      encryptedInvoiceSize: encrypted.encryptedInvoiceSize,
      encryptedInvoiceContent: encrypted.encryptedInvoice.toString('base64'),
      offlineMode: false
    });
  } catch (error) {
    await closeAfterFailure(lifecycle, sessionReference);
    if (lifecycle.isTransportError(error)) {
      throw ambiguousUploadError(sessionReference, encrypted.invoiceHash);
    }
    throw error;
  }

  if (!invoice?.referenceNumber) {
    await closeAfterFailure(lifecycle, sessionReference);
    throw ambiguousUploadError(sessionReference, encrypted.invoiceHash);
  }

  let closureWarning: string | undefined;
  try {
    await lifecycle.closeSession(sessionReference);
  } catch {
    closureWarning = `The invoice was accepted for processing, but session ${sessionReference} could not be closed automatically. Check its status and use close_session if it is still open.`;
  }

  return {
    sessionReference,
    invoiceReference: invoice.referenceNumber,
    invoiceHash: encrypted.invoiceHash,
    invoiceSize: encrypted.invoiceSize,
    sessionValidUntil: session.validUntil,
    sessionClosed: !closureWarning,
    ...(closureWarning ? { closureWarning } : {})
  };
}
