import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

const countSchema = z.number().int().nonnegative().nullable().optional();

const sessionStatusResponseSchema = z.object({
  status: z.object({
    code: z.number().int(),
    description: z.string(),
    details: z.array(z.string()).nullable().optional()
  }),
  dateCreated: z.string(),
  dateUpdated: z.string(),
  validUntil: z.string().nullable().optional(),
  invoiceCount: countSchema,
  successfulInvoiceCount: countSchema,
  failedInvoiceCount: countSchema,
  upo: z
    .object({
      pages: z.array(
        z.object({
          referenceNumber: z.string(),
          downloadUrlExpirationDate: z.string()
        })
      )
    })
    .nullable()
    .optional()
});

const failureCodes = new Set([405, 415, 420, 430, 435, 440, 445, 500, 550]);

function processingState(code: number): 'pending' | 'success' | 'failure' | 'unknown' {
  if (code === 100 || code === 150 || code === 170) return 'pending';
  if (code === 200) return 'success';
  if (failureCodes.has(code)) return 'failure';
  return 'unknown';
}

export const getSessionStatusTool = SlateTool.create(spec, {
  name: 'Get Session Status',
  key: 'get_session_status',
  description:
    'Check an invoice submission session for its current processing status, invoice counts, and available session UPO pages.',
  instructions: [
    'A successful session status reports session processing only. Use get_invoice_status to confirm the result for a particular invoice.',
    'When upoPages contains references, pass a page reference to download_session_upo to download the session receipt.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Reference number of the KSeF invoice submission session to inspect.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z
        .string()
        .describe('Reference number of the inspected session.'),
      processingState: z
        .enum(['pending', 'success', 'failure', 'unknown'])
        .describe(
          'Broad session processing state derived from documented KSeF codes; unknown preserves unrecognized codes.'
        ),
      status: z
        .object({
          code: z.number().int().describe('Numeric KSeF session status code.'),
          description: z.string().describe('KSeF description of the session status.'),
          details: z
            .array(z.string())
            .describe('Additional status details returned by KSeF, if any.')
        })
        .describe(
          'Current KSeF session status; inspect the code and description for exact meaning.'
        ),
      dateCreated: z.string().describe('Date and time the session was created.'),
      dateUpdated: z.string().describe('Date and time of the latest session activity.'),
      validUntil: z
        .string()
        .nullable()
        .describe('Date and time the session will expire, when provided by KSeF.'),
      invoiceCount: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .describe('Number of invoices accepted into the session, when available.'),
      successfulInvoiceCount: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .describe('Number of invoices processed successfully, when available.'),
      failedInvoiceCount: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .describe('Number of invoices processed with errors, when available.'),
      upoPages: z
        .array(
          z.object({
            upoReferenceNumber: z
              .string()
              .describe('UPO page reference number to pass to download_session_upo.'),
            downloadUrlExpirationDate: z
              .string()
              .describe(
                'Expiration of the temporary provider download link for this UPO page.'
              )
          })
        )
        .describe('Available session UPO pages; empty until KSeF generates the receipt.')
    })
  )
  .handleInvocation(async ctx => {
    const { sessionReferenceNumber } = ctx.input;
    const client = new KsefClient(ctx.auth);
    const response = await client.request<unknown>(
      'get session status',
      'GET',
      `/sessions/${encodeURIComponent(sessionReferenceNumber)}`,
      { safeRead: true }
    );
    const parsed = sessionStatusResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError('KSeF returned an invalid session status response.', {
        reason: 'ksef_invalid_response'
      });
    }
    const session = parsed.data;

    const state = processingState(session.status.code);
    const upoPages = (session.upo?.pages ?? []).map(page => ({
      upoReferenceNumber: page.referenceNumber,
      downloadUrlExpirationDate: page.downloadUrlExpirationDate
    }));

    return {
      output: {
        sessionReferenceNumber,
        processingState: state,
        status: {
          code: session.status.code,
          description: session.status.description,
          details: session.status.details ?? []
        },
        dateCreated: session.dateCreated,
        dateUpdated: session.dateUpdated,
        validUntil: session.validUntil ?? null,
        invoiceCount: session.invoiceCount ?? null,
        successfulInvoiceCount: session.successfulInvoiceCount ?? null,
        failedInvoiceCount: session.failedInvoiceCount ?? null,
        upoPages
      },
      message: `Session **${sessionReferenceNumber}**: ${session.status.description} (code ${session.status.code}). ${upoPages.length} session UPO page(s) available.`
    };
  })
  .build();
