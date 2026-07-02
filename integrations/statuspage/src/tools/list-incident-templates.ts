import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIncidentTemplates = SlateTool.create(spec, {
  name: 'List Incident Templates',
  key: 'list_incident_templates',
  description: `List all incident templates configured for the status page. Templates contain pre-filled incident names, messages, statuses, and component associations for quick incident creation.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            name: z.string().optional().describe('Name of the template'),
            title: z.string().optional().describe('Pre-filled incident title'),
            body: z
              .string()
              .optional()
              .nullable()
              .describe('Pre-filled incident message body'),
            groupId: z.string().optional().nullable().describe('Component group ID'),
            updateStatus: z.string().optional().describe('Pre-filled incident status'),
            shouldTweet: z.boolean().optional().describe('Whether to post to Twitter'),
            shouldNotifySubscribers: z
              .boolean()
              .optional()
              .describe('Whether to notify subscribers'),
            componentIds: z
              .array(z.string())
              .optional()
              .describe('Pre-filled affected component IDs')
          })
        )
        .describe('List of incident templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
    let raw = await client.listIncidentTemplates();

    let templates = raw.map((t: any) => ({
      templateId: t.id,
      name: t.name,
      title: t.title,
      body: t.body,
      groupId: t.group_id,
      updateStatus: t.update_status,
      shouldTweet: t.should_tweet,
      shouldNotifySubscribers: t.should_notify_subscribers,
      componentIds: t.component_ids
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** incident template(s).`
    };
  })
  .build();
