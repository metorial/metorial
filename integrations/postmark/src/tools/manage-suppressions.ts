import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressions = SlateTool.create(spec, {
  name: 'Manage Suppressions',
  key: 'manage_suppressions',
  description: `View, create, or delete email suppressions in a Postmark message stream. Suppressed addresses will not receive emails. Use this to list current suppressions, manually suppress addresses, or remove suppressions to re-enable sending.`,
  instructions: [
    'Set **action** to "list" to view suppressions, "create" to suppress addresses, or "delete" to remove suppressions.',
    'A **streamId** is required — use "outbound" for the default transactional stream.'
  ],
  constraints: [
    'Maximum 50 email addresses per create or delete request.',
    'SpamComplaint suppressions cannot be deleted.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete'])
        .describe('Action to perform on suppressions.'),
      streamId: z.string().describe('Message stream ID (e.g., "outbound", "broadcasts").'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to suppress or unsuppress (for create/delete actions).'),
      suppressionReason: z
        .string()
        .optional()
        .describe(
          'Filter by reason: "HardBounce", "SpamComplaint", "ManualSuppression" (for list).'
        ),
      origin: z
        .string()
        .optional()
        .describe('Filter by origin: "Recipient", "Customer", "Admin" (for list).'),
      fromDate: z.string().optional().describe('Start date filter (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('End date filter (YYYY-MM-DD).'),
      emailAddress: z
        .string()
        .optional()
        .describe('Filter by specific email address (for list).')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(
          z.object({
            emailAddress: z.string().describe('Suppressed email address.'),
            suppressionReason: z.string().optional().describe('Reason for suppression.'),
            origin: z.string().optional().describe('Origin of the suppression.'),
            createdAt: z.string().optional().describe('When the suppression was created.'),
            status: z.string().optional().describe('Result status (for create/delete).'),
            statusMessage: z
              .string()
              .optional()
              .describe('Status message (for create/delete).')
          })
        )
        .describe('List of suppressions or operation results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.getSuppressions(ctx.input.streamId, {
        suppressionReason: ctx.input.suppressionReason,
        origin: ctx.input.origin,
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate,
        emailAddress: ctx.input.emailAddress
      });

      return {
        output: {
          suppressions: result.Suppressions.map(s => ({
            emailAddress: s.EmailAddress,
            suppressionReason: s.SuppressionReason,
            origin: s.Origin,
            createdAt: s.CreatedAt
          }))
        },
        message: `Found **${result.Suppressions.length}** suppressions in stream "${ctx.input.streamId}".`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.emailAddresses || ctx.input.emailAddresses.length === 0) {
        throw new Error('emailAddresses are required for creating suppressions');
      }

      let result = await client.createSuppressions(
        ctx.input.streamId,
        ctx.input.emailAddresses
      );

      return {
        output: {
          suppressions: result.Suppressions.map(s => ({
            emailAddress: s.EmailAddress,
            status: s.Status,
            statusMessage: s.Message
          }))
        },
        message: `Created suppressions for **${ctx.input.emailAddresses.length}** address(es) in stream "${ctx.input.streamId}".`
      };
    }

    if (!ctx.input.emailAddresses || ctx.input.emailAddresses.length === 0) {
      throw new Error('emailAddresses are required for deleting suppressions');
    }

    let result = await client.deleteSuppressions(ctx.input.streamId, ctx.input.emailAddresses);

    return {
      output: {
        suppressions: result.Suppressions.map(s => ({
          emailAddress: s.EmailAddress,
          status: s.Status,
          statusMessage: s.Message
        }))
      },
      message: `Deleted suppressions for **${ctx.input.emailAddresses.length}** address(es) in stream "${ctx.input.streamId}".`
    };
  });
