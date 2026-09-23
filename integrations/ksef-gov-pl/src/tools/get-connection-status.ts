import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

const sessionLimitsSchema = z.object({
  maxInvoiceSizeInMB: z
    .number()
    .int()
    .nonnegative()
    .describe(
      'Maximum size of one invoice without an attachment, in decimal MB (1 MB = 1,000,000 bytes).'
    ),
  maxInvoiceWithAttachmentSizeInMB: z
    .number()
    .int()
    .nonnegative()
    .describe(
      'Maximum size of one invoice with an attachment, in decimal MB (1 MB = 1,000,000 bytes).'
    ),
  maxInvoices: z.number().int().nonnegative().describe('Maximum invoices in one session.')
});

export const getConnectionStatusTool = SlateTool.create(spec, {
  name: 'Get Connection Status',
  key: 'get_connection_status',
  description:
    'Verify KSeF access and return the configured environment, authenticated context, and current effective context limits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      environment: z
        .enum(['TEST', 'DEMO', 'PRODUCTION'])
        .describe('KSeF environment configured for this connection.'),
      context: z
        .object({
          type: z
            .enum(['Nip', 'InternalId', 'NipVatUe', 'PeppolId'])
            .describe('Identifier type used to authenticate this KSeF context.'),
          identifier: z.string().describe('Identifier used to authenticate this KSeF context.')
        })
        .describe('Configured context authenticated by this connection.'),
      limits: z
        .object({
          onlineSession: sessionLimitsSchema.describe('Effective limits for online sessions.'),
          batchSession: sessionLimitsSchema.describe('Effective limits for batch sessions.'),
          collectiveIdentifier: z
            .object({
              maxInvoices: z
                .number()
                .int()
                .nonnegative()
                .describe('Maximum invoices in one collective identifier.')
            })
            .describe('Effective limits for collective identifiers.')
        })
        .describe('Effective limits returned by KSeF for the current authenticated context.')
    })
  )
  .handleInvocation(async ctx => {
    const client = new KsefClient(ctx.auth);
    const limits = await client.getContextLimits();

    return {
      output: {
        environment: ctx.auth.environment,
        context: {
          type: ctx.auth.contextType,
          identifier: ctx.auth.contextIdentifier
        },
        limits: {
          onlineSession: {
            maxInvoiceSizeInMB: limits.onlineSession.maxInvoiceSizeInMB,
            maxInvoiceWithAttachmentSizeInMB:
              limits.onlineSession.maxInvoiceWithAttachmentSizeInMB,
            maxInvoices: limits.onlineSession.maxInvoices
          },
          batchSession: {
            maxInvoiceSizeInMB: limits.batchSession.maxInvoiceSizeInMB,
            maxInvoiceWithAttachmentSizeInMB:
              limits.batchSession.maxInvoiceWithAttachmentSizeInMB,
            maxInvoices: limits.batchSession.maxInvoices
          },
          collectiveIdentifier: {
            maxInvoices: limits.collectiveIdentifier.maxInvoices
          }
        }
      },
      message: `KSeF access verified for ${ctx.auth.contextType} ${ctx.auth.contextIdentifier} in ${ctx.auth.environment}.`
    };
  })
  .build();
