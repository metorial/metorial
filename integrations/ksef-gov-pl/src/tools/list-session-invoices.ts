import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { ksefValidationError } from '../lib/errors';
import { spec } from '../spec';

const processingResult = (code: number) => {
  if (code === 100 || code === 150) return 'pending' as const;
  if (code === 200) return 'success' as const;
  if (code === 440) return 'duplicate' as const;
  if ([405, 410, 415, 430, 435, 450, 500, 550].includes(code)) return 'rejected' as const;
  return 'unknown' as const;
};

const statusSchema = z.object({
  code: z.number().int().describe('Exact KSeF processing status code.'),
  description: z.string().describe('KSeF processing status description.'),
  details: z.array(z.string()).nullable().optional().describe('Provider processing details.'),
  extensions: z
    .record(z.string(), z.string().nullable())
    .nullable()
    .optional()
    .describe('Additional provider status fields, including duplicate references.')
});

const providerResponseSchema = z.object({
  continuationToken: z.string().nullish(),
  invoices: z.array(
    z.object({
      ordinalNumber: z.number().int(),
      invoiceNumber: z.string().nullish(),
      ksefNumber: z.string().nullish(),
      referenceNumber: z.string(),
      invoiceHash: z.string(),
      invoiceFileName: z.string().nullish(),
      acquisitionDate: z.string().nullish(),
      invoicingDate: z.string(),
      permanentStorageDate: z.string().nullish(),
      upoDownloadUrl: z.string().nullish(),
      invoicingMode: z.string().nullish(),
      status: statusSchema
    })
  )
});

export const listSessionInvoicesTool = SlateTool.create(spec, {
  name: 'List Session Invoices',
  key: 'list_session_invoices',
  description:
    'List submitted invoices in a KSeF session with their references, hashes, KSeF numbers, and processing results. Use the continuation token to fetch the next page.',
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
        .describe('Reference number of the KSeF submission session.'),
      pageSize: z
        .number()
        .int()
        .min(10)
        .max(1000)
        .optional()
        .describe('Number of invoices per page, from 10 to 1000. Defaults to 10.'),
      continuationToken: z
        .string()
        .min(1)
        .optional()
        .describe('Continuation token returned by a previous page of this session.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z.string().describe('Reference number of the session queried.'),
      continuationToken: z
        .string()
        .nullable()
        .describe(
          'Pass this token to fetch the next page; null means there are no more pages.'
        ),
      invoices: z.array(
        z.object({
          ordinalNumber: z.number().int().describe('Sequence number within the session.'),
          invoiceNumber: z
            .string()
            .optional()
            .describe('Invoice number from the XML document.'),
          ksefNumber: z.string().optional().describe('KSeF number when assigned.'),
          invoiceReferenceNumber: z
            .string()
            .describe('Submission reference for this invoice.'),
          invoiceHash: z.string().describe('SHA-256 hash of the original invoice, in Base64.'),
          invoiceFileName: z
            .string()
            .optional()
            .describe('Original file name for batch invoices.'),
          acquisitionDate: z
            .string()
            .optional()
            .describe('When KSeF assigned the invoice number.'),
          invoicingDate: z.string().describe('When KSeF accepted the invoice for processing.'),
          permanentStorageDate: z
            .string()
            .optional()
            .describe('When the invoice reached permanent storage, if available.'),
          upoAvailable: z
            .boolean()
            .describe('Whether KSeF currently offers an invoice receipt download.'),
          invoicingMode: z.string().optional().describe('Invoicing mode when reported.'),
          processingResult: z
            .enum(['pending', 'success', 'rejected', 'duplicate', 'unknown'])
            .describe(
              'Summary of the processing status; inspect status.code for the exact result.'
            ),
          status: statusSchema,
          originalInvoice: z
            .object({
              sessionReferenceNumber: z
                .string()
                .optional()
                .describe('Session reference of the original invoice.'),
              ksefNumber: z
                .string()
                .optional()
                .describe('KSeF number of the original invoice.')
            })
            .optional()
            .describe('Original invoice references provided for a duplicate submission.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const { sessionReferenceNumber, pageSize, continuationToken } = ctx.input;
    const client = new KsefClient(ctx.auth);
    const response = await client.request<unknown>(
      'list session invoices',
      'GET',
      `/sessions/${encodeURIComponent(sessionReferenceNumber)}/invoices`,
      {
        query: pageSize === undefined ? undefined : { pageSize },
        headers: continuationToken ? { 'x-continuation-token': continuationToken } : undefined,
        safeRead: true
      }
    );
    const parsed = providerResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw ksefValidationError('KSeF returned an invalid session invoice response.');
    }
    const result = parsed.data;

    const invoices = result.invoices.map(invoice => {
      const originalSessionReferenceNumber =
        invoice.status.extensions?.originalSessionReferenceNumber ?? undefined;
      const originalKsefNumber = invoice.status.extensions?.originalKsefNumber ?? undefined;
      const originalInvoice =
        invoice.status.code === 440 && (originalSessionReferenceNumber || originalKsefNumber)
          ? {
              sessionReferenceNumber: originalSessionReferenceNumber,
              ksefNumber: originalKsefNumber
            }
          : undefined;

      return {
        ordinalNumber: invoice.ordinalNumber,
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        ksefNumber: invoice.ksefNumber ?? undefined,
        invoiceReferenceNumber: invoice.referenceNumber,
        invoiceHash: invoice.invoiceHash,
        invoiceFileName: invoice.invoiceFileName ?? undefined,
        acquisitionDate: invoice.acquisitionDate ?? undefined,
        invoicingDate: invoice.invoicingDate,
        permanentStorageDate: invoice.permanentStorageDate ?? undefined,
        upoAvailable:
          invoice.status.code === 200 &&
          Boolean(invoice.ksefNumber) &&
          Boolean(invoice.upoDownloadUrl),
        invoicingMode: invoice.invoicingMode ?? undefined,
        processingResult: processingResult(invoice.status.code),
        status: invoice.status,
        originalInvoice
      };
    });

    return {
      output: {
        sessionReferenceNumber,
        continuationToken: result.continuationToken || null,
        invoices
      },
      message: `Found **${invoices.length}** invoices in KSeF session **${sessionReferenceNumber}**${result.continuationToken ? '; another page is available.' : '.'}`
    };
  })
  .build();
