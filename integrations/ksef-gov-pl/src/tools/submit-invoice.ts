import { ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { getPublicCertificate, isRetiredCertificateError } from '../lib/certificates';
import { KsefClient } from '../lib/client';
import { encryptInvoice } from '../lib/crypto';
import { isKsefTransportError, ksefValidationError } from '../lib/errors';
import { type SubmissionLifecycle, submitOnlineInvoice } from '../lib/submission';
import { hasEmbeddedAttachment, validateInvoiceXml } from '../lib/xml';
import { spec } from '../spec';

const BYTES_PER_MB = 1_000_000;

export const submitInvoiceTool = SlateTool.create(spec, {
  name: 'Submit Invoice',
  key: 'submit_invoice',
  description:
    'Submit one complete FA(3) XML invoice for processing in KSeF. This action is irreversible. Acceptance starts processing and does not mean that a KSeF number has been issued.',
  constraints: [
    'The connected KSeF token must have InvoiceWrite, PefInvoiceWrite, or EnforcementOperations permission.',
    'Check the returned invoice status before treating the invoice as issued or submitting it again.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      invoiceXml: z
        .string()
        .min(1)
        .describe('Complete FA(3) invoice XML document encoded as UTF-8 text.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z
        .string()
        .describe('Reference number of the online submission session.'),
      invoiceReferenceNumber: z
        .string()
        .describe('Reference number of the submitted invoice in the session.'),
      invoiceHash: z
        .string()
        .describe('Base64 SHA-256 hash of the exact submitted XML bytes.'),
      invoiceSize: z.number().describe('Size of the exact submitted XML in bytes.'),
      sessionValidUntil: z.string().describe('Provider expiry of the online session.'),
      sessionClosed: z.boolean().describe('Whether KSeF confirmed the session was closed.'),
      closureWarning: z
        .string()
        .optional()
        .describe('How to recover if automatic session closure failed.'),
      submissionStatus: z
        .literal('accepted_for_processing')
        .describe(
          'KSeF has queued this invoice for processing; issuance is not yet confirmed.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const xml = validateInvoiceXml(ctx.input.invoiceXml);
    const client = new KsefClient(ctx.auth);
    const limits = await client.getContextLimits();
    const withAttachment = hasEmbeddedAttachment(ctx.input.invoiceXml);
    const maxSizeMb = withAttachment
      ? limits.onlineSession.maxInvoiceWithAttachmentSizeInMB
      : limits.onlineSession.maxInvoiceSizeInMB;

    if (xml.length > maxSizeMb * BYTES_PER_MB) {
      throw ksefValidationError(
        `The FA(3) invoice is ${xml.length} bytes, exceeding this context's ${maxSizeMb} MB online invoice limit${withAttachment ? ' for invoices with an embedded attachment' : ''}.`
      );
    }

    const lifecycle: SubmissionLifecycle = {
      async prepare(forceRefresh) {
        const certificate = await getPublicCertificate(
          ctx.auth.environment,
          'SymmetricKeyEncryption',
          forceRefresh
        );
        return {
          encrypted: encryptInvoice(xml, certificate),
          publicKeyId: certificate.publicKeyId
        };
      },
      openSession: body =>
        client.request<{ referenceNumber: string; validUntil: string }>(
          'open online session',
          'POST',
          '/sessions/online',
          { body }
        ),
      uploadInvoice: (sessionReference, body) =>
        client.request<{ referenceNumber: string }>(
          'submit invoice',
          'POST',
          `/sessions/online/${encodeURIComponent(sessionReference)}/invoices`,
          { body }
        ),
      closeSession: sessionReference =>
        client.request<void>(
          'close online session',
          'POST',
          `/sessions/online/${encodeURIComponent(sessionReference)}/close`
        ),
      isRetiredKeyError: isRetiredCertificateError,
      isTransportError: error => {
        if (isKsefTransportError(error)) return true;
        // A server failure after an upload request also leaves acceptance uncertain.
        const status =
          error instanceof ServiceError ? Number(error.data.upstreamStatus) : Number.NaN;
        return status >= 500 && status <= 599;
      }
    };

    const result = await submitOnlineInvoice(lifecycle);
    return {
      output: {
        sessionReferenceNumber: result.sessionReference,
        invoiceReferenceNumber: result.invoiceReference,
        invoiceHash: result.invoiceHash,
        invoiceSize: result.invoiceSize,
        sessionValidUntil: result.sessionValidUntil,
        sessionClosed: result.sessionClosed,
        closureWarning: result.closureWarning,
        submissionStatus: 'accepted_for_processing' as const
      },
      message: result.closureWarning
        ? `KSeF accepted invoice ${result.invoiceReference} in session ${result.sessionReference} for processing. ${result.closureWarning}`
        : `KSeF accepted invoice ${result.invoiceReference} in session ${result.sessionReference} for processing. Check its status to confirm issuance.`
    };
  })
  .build();
