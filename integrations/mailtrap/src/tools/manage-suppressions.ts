import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressions = SlateTool.create(spec, {
  name: 'Manage Suppressions',
  key: 'manage_suppressions',
  description: `List or remove email suppression entries. Suppressions are created automatically when hard bounces, unsubscribes, or spam complaints occur. Suppressed addresses cannot receive emails. Removing a suppression reactivates the address for sending.`,
  constraints: [
    'Suppressions are separated by stream — unsubscribing from bulk email does not affect transactional email.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'delete']).describe('Action to perform'),
      suppressionId: z
        .number()
        .optional()
        .describe(
          'Legacy numeric suppression ID. For current suppressions use suppressionUuid.'
        ),
      suppressionUuid: z
        .string()
        .optional()
        .describe(
          'Suppression UUID returned by the list action. Required for deleting current suppression entries.'
        ),
      lastId: z
        .string()
        .optional()
        .describe('Suppression UUID of the last item on the previous page (for list).'),
      email: z.string().optional().describe('Filter by email address (for list)'),
      startTime: z
        .string()
        .optional()
        .describe('Filter suppressions after this timestamp (ISO 8601, for list)'),
      endTime: z
        .string()
        .optional()
        .describe('Filter suppressions before this timestamp (ISO 8601, for list)')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(
          z.object({
            suppressionId: z.number().optional().describe('Legacy numeric suppression ID'),
            suppressionUuid: z.string().optional().describe('Suppression UUID'),
            sendingStream: z
              .string()
              .optional()
              .describe('Sending stream for this suppression'),
            email: z.string().describe('Suppressed email address'),
            reason: z
              .string()
              .describe('Reason for suppression (bounce, complaint, unsubscribe, manual)'),
            createdAt: z.string().describe('When the suppression was created')
          })
        )
        .optional()
        .describe('List of suppressions'),
      deleted: z.boolean().optional().describe('Whether the suppression was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token
    });

    let { action, suppressionId, suppressionUuid, email, startTime, endTime, lastId } =
      ctx.input;

    if (action === 'list') {
      let result = await client.listSuppressions({ email, startTime, endTime, lastId });
      let suppressions = (Array.isArray(result) ? result : []).map((s: any) => ({
        suppressionId: typeof s.id === 'number' ? s.id : undefined,
        suppressionUuid: typeof s.id === 'string' ? s.id : undefined,
        sendingStream: s.sending_stream,
        email: s.email,
        reason: s.type ?? s.reason ?? 'unknown',
        createdAt: s.created_at || ''
      }));
      return {
        output: { suppressions },
        message: `Found **${suppressions.length}** suppression(s).${email ? ` Filtered by email: ${email}.` : ''}`
      };
    }

    if (action === 'delete') {
      let identifier = suppressionUuid ?? suppressionId;
      if (!identifier)
        throw createApiServiceError(
          'Provide suppressionUuid from the list action, or a legacy suppressionId, to remove a suppression.'
        );
      await client.deleteSuppression(identifier);
      return {
        output: { deleted: true },
        message: `Suppression **${identifier}** removed. The email address is now reactivated for sending.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
