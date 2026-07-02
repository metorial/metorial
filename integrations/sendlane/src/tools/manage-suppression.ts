import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppression = SlateTool.create(spec, {
  name: 'Manage Email Suppression',
  key: 'manage_suppression',
  description: `Add or remove email addresses from the suppression list, or retrieve the current suppressed emails. Suppressed emails will not receive any marketing communications.`,
  instructions: [
    'Use "list" to see currently suppressed emails.',
    'Use "add" to suppress one or more email addresses.',
    'Use "remove" to unsuppress one or more email addresses.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add', 'remove'])
        .describe('Action to perform on the suppression list'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to add/remove (required for add/remove actions)'),
      page: z.number().optional().default(1).describe('Page number for listing'),
      perPage: z.number().optional().default(25).describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      suppressedEmails: z
        .array(z.string())
        .optional()
        .describe('Currently suppressed emails (only for list action)'),
      total: z
        .number()
        .optional()
        .describe('Total suppressed email count (only for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listSuppressed(ctx.input.page, ctx.input.perPage);
      let emails = result.data.map(s => s.email);
      return {
        output: {
          success: true,
          suppressedEmails: emails,
          total: result.pagination.total
        },
        message: `Found **${emails.length}** suppressed emails (page ${result.pagination.currentPage} of ${result.pagination.lastPage}, ${result.pagination.total} total).`
      };
    }

    if (!ctx.input.emails || ctx.input.emails.length === 0) {
      throw new Error('Emails are required for add/remove actions');
    }

    if (ctx.input.action === 'add') {
      await client.addToSuppression(ctx.input.emails);
      return {
        output: { success: true },
        message: `Added **${ctx.input.emails.length}** email(s) to the suppression list.`
      };
    }

    await client.removeFromSuppression(ctx.input.emails);
    return {
      output: { success: true },
      message: `Removed **${ctx.input.emails.length}** email(s) from the suppression list.`
    };
  })
  .build();
