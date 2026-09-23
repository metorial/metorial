import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

const invoiceStatusResponseSchema = z.object({
  ordinalNumber: z.number().int().positive(),
  invoiceNumber: z.string().nullish(),
  ksefNumber: z.string().nullish(),
  referenceNumber: z.string(),
  invoiceHash: z.string(),
  invoiceFileName: z.string().nullish(),
  acquisitionDate: z.string().nullish(),
  invoicingDate: z.string(),
  permanentStorageDate: z.string().nullish(),
  upoDownloadUrl: z.string().nullish(),
  invoicingMode: z.enum(['Online', 'Offline']).nullish(),
  status: z.object({
    code: z.number().int(),
    description: z.string(),
    details: z.array(z.string()).nullish(),
    extensions: z.record(z.string(), z.string().nullable()).nullish()
  })
});

function processingState(code: number) {
  if (code === 100 || code === 150) return 'pending' as const;
  if (code === 200) return 'success' as const;
  if (code === 440) return 'duplicate' as const;
  if ([405, 410, 415, 430, 435, 450, 500, 550].includes(code)) return 'rejected' as const;
  return 'unknown' as const;
}

export const getInvoiceStatusTool = SlateTool.create(spec, {
  name: 'Get Invoice Status',
  key: 'get_invoice_status',
  description:
    'Check a submitted invoice by its session and invoice references. Return its processing result, KSeF number, duplicate origin, and receipt readiness.',
  constraints: [
    'The connected KSeF token must have InvoiceWrite, Introspection, PefInvoiceWrite, or EnforcementOperations permission.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Session reference returned by submit_invoice or list_sessions.'),
      invoiceReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Invoice reference returned by submit_invoice or list_session_invoices.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z
        .string()
        .describe('Session reference used to check this invoice.'),
      invoiceReferenceNumber: z
        .string()
        .describe('Reference of the invoice within the session.'),
      ordinalNumber: z
        .number()
        .int()
        .describe('Sequence number of the invoice within its session.'),
      invoiceNumber: z.string().optional().describe('Invoice number recorded by KSeF.'),
      ksefNumber: z
        .string()
        .optional()
        .describe('KSeF number assigned after successful processing.'),
      invoiceHash: z
        .string()
        .describe('SHA-256 hash of the original invoice, encoded as Base64.'),
      invoiceFileName: z
        .string()
        .optional()
        .describe('File name for a batch-submitted invoice.'),
      acquisitionDate: z
        .string()
        .optional()
        .describe('Time when the KSeF number was assigned.'),
      invoicingDate: z.string().describe('Time KSeF accepted the invoice for processing.'),
      permanentStorageDate: z
        .string()
        .optional()
        .describe('Time the invoice was permanently stored, when available.'),
      invoicingMode: z
        .enum(['Online', 'Offline'])
        .optional()
        .describe('Invoice submission mode.'),
      status: z
        .object({
          code: z.number().int().describe('Provider processing status code.'),
          description: z.string().describe('Provider processing status description.'),
          details: z.array(z.string()).optional().describe('Provider processing details.'),
          extensions: z
            .record(z.string(), z.string().nullable())
            .optional()
            .describe(
              'Additional provider status fields, including duplicate origin references.'
            )
        })
        .describe('Full KSeF invoice processing status.'),
      processingState: z
        .enum(['pending', 'success', 'rejected', 'duplicate', 'unknown'])
        .describe('Normalized invoice processing state.'),
      originalSessionReferenceNumber: z
        .string()
        .optional()
        .describe(
          'Session containing the original invoice when this submission is a duplicate.'
        ),
      originalKsefNumber: z
        .string()
        .optional()
        .describe('KSeF number of the original invoice when this submission is a duplicate.'),
      upoReady: z
        .boolean()
        .describe(
          'Whether KSeF reports a receipt ready for download using the session and invoice references.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const { sessionReferenceNumber, invoiceReferenceNumber } = ctx.input;
    const client = new KsefClient(ctx.auth);
    const response = await client.request<unknown>(
      'get invoice status',
      'GET',
      `/sessions/${encodeURIComponent(sessionReferenceNumber)}/invoices/${encodeURIComponent(invoiceReferenceNumber)}`,
      { safeRead: true }
    );
    const parsed = invoiceStatusResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError('KSeF returned an invalid invoice status response.', {
        reason: 'ksef_invalid_response'
      });
    }
    const invoice = parsed.data;
    const state = processingState(invoice.status.code);
    const extensions = invoice.status.extensions ?? undefined;

    return {
      output: {
        sessionReferenceNumber,
        invoiceReferenceNumber: invoice.referenceNumber,
        ordinalNumber: invoice.ordinalNumber,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        ksefNumber: invoice.ksefNumber ?? undefined,
        invoiceHash: invoice.invoiceHash,
        invoiceFileName: invoice.invoiceFileName ?? undefined,
        acquisitionDate: invoice.acquisitionDate ?? undefined,
        invoicingDate: invoice.invoicingDate,
        permanentStorageDate: invoice.permanentStorageDate ?? undefined,
        invoicingMode: invoice.invoicingMode ?? undefined,
        status: {
          code: invoice.status.code,
          description: invoice.status.description,
          details: invoice.status.details ?? undefined,
          extensions
        },
        processingState: state,
        originalSessionReferenceNumber:
          state === 'duplicate'
            ? (extensions?.originalSessionReferenceNumber ?? undefined)
            : undefined,
        originalKsefNumber:
          state === 'duplicate' ? (extensions?.originalKsefNumber ?? undefined) : undefined,
        upoReady: state === 'success' && Boolean(invoice.upoDownloadUrl)
      },
      message: `Invoice **${invoice.referenceNumber}** is **${state}** in KSeF (status ${invoice.status.code}: ${invoice.status.description}).`
    };
  })
  .build();
