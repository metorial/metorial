import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressionList = SlateTool.create(spec, {
  name: 'Manage Suppression List',
  key: 'manage_suppression_list',
  description: `View or add email addresses to the global suppression list. Suppressed addresses are blocked from receiving any emails across all lists and campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'add'])
        .describe(
          'Operation to perform: "list" to view all suppressed addresses, "add" to suppress a new address'
        ),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address to add to the suppression list (required for "add" action)')
    })
  )
  .output(
    z.object({
      suppressedEmails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of suppressed email records (for "list" action)'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.action === 'list') {
      let result = await client.getSuppressionList();
      let emails = result.SuppressionList || result.Data || [];
      if (!Array.isArray(emails)) emails = [emails];

      return {
        output: { suppressedEmails: emails, success: true },
        message: `Retrieved **${emails.length}** suppressed email address(es).`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.emailAddress) throw new Error('Email address is required for add action');
      await client.addToSuppressionList(ctx.input.emailAddress);

      return {
        output: { success: true },
        message: `Successfully added **${ctx.input.emailAddress}** to the suppression list.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
