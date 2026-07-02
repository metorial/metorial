import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let listAutomationsTool = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `Retrieve classic automation workflows from the Mailchimp account. Returns workflow IDs, names, statuses, trigger settings, and email counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of automations to return (default 100)'),
      offset: z.number().optional().describe('Number of automations to skip')
    })
  )
  .output(
    z.object({
      automations: z.array(
        z.object({
          workflowId: z.string(),
          title: z.string().optional(),
          status: z.string(),
          emailsSent: z.number(),
          startTime: z.string().optional(),
          createTime: z.string(),
          listId: z.string().optional(),
          listName: z.string().optional()
        })
      ),
      totalItems: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.getAutomations({
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    let automations = (result.automations ?? []).map((a: any) => ({
      workflowId: a.id,
      title: a.settings?.title,
      status: a.status,
      emailsSent: a.emails_sent ?? 0,
      startTime: a.start_time || undefined,
      createTime: a.create_time,
      listId: a.recipients?.list_id,
      listName: a.recipients?.list_name
    }));

    return {
      output: {
        automations,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${automations.length}** automation(s) out of ${result.total_items ?? 0} total.`
    };
  })
  .build();
