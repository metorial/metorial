import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplateNotifications = SlateTool.create(spec, {
  name: 'List Template Notifications',
  key: 'list_template_notifications',
  description:
    'List scheduled and previously executed push notifications or template update tasks. Returns notification IDs needed to cancel pending tasks before deleting a template.',
  tags: { readOnly: true }
})
  .input(
    z.object({ templateId: z.string().describe('Template identifier from list_templates') })
  )
  .output(
    z.object({
      scheduledTasks: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Pending tasks with notificationId, publicationDate, and optional notificationText'
        ),
      executedTasks: z
        .array(z.record(z.string(), z.any()))
        .describe('Previously executed tasks')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listTemplateNotifications(
      ctx.input.templateId
    );
    let scheduledTasks = result.scheduledTasks ?? [];
    let executedTasks = result.executedTasks ?? [];
    return {
      output: { scheduledTasks, executedTasks },
      message: `Found **${scheduledTasks.length}** pending and **${executedTasks.length}** executed task(s).`
    };
  })
  .build();
