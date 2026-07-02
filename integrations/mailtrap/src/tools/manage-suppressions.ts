import { SlateTool } from 'slates';
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
        .describe('Suppression ID to delete. Required for delete.'),
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
            suppressionId: z.number().describe('Suppression ID'),
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
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, suppressionId, email, startTime, endTime } = ctx.input;

    if (action === 'list') {
      let result = await client.listSuppressions({ email, startTime, endTime });
      let suppressions = (Array.isArray(result) ? result : []).map((s: any) => ({
        suppressionId: s.id,
        email: s.email,
        reason: s.reason || 'unknown',
        createdAt: s.created_at || ''
      }));
      return {
        output: { suppressions },
        message: `Found **${suppressions.length}** suppression(s).${email ? ` Filtered by email: ${email}.` : ''}`
      };
    }

    if (action === 'delete') {
      if (!suppressionId)
        throw new Error('suppressionId is required for removing a suppression');
      await client.deleteSuppression(suppressionId);
      return {
        output: { deleted: true },
        message: `Suppression **${suppressionId}** removed. The email address is now reactivated for sending.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
