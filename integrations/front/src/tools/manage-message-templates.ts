import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateId: z.string(),
  name: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  isAvailableForAllInboxes: z.boolean()
});

export let listMessageTemplates = SlateTool.create(spec, {
  name: 'List Message Templates',
  key: 'list_message_templates',
  description: `List reusable message templates available in Front. Templates can be used as starting points for common replies.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessageTemplates({
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit
    });

    let templates = result._results.map(t => ({
      templateId: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      isAvailableForAllInboxes: t.is_available_for_all_inboxes
    }));

    return {
      output: { templates, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${templates.length}** message templates.`
    };
  });

export let createMessageTemplate = SlateTool.create(spec, {
  name: 'Create Message Template',
  key: 'create_message_template',
  description: `Create a new reusable message template. Templates support HTML body content and optional subject lines.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      subject: z.string().optional().describe('Template subject line'),
      body: z.string().describe('Template body (HTML)'),
      folderId: z.string().optional().describe('Folder ID to place the template in')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let template = await client.createMessageTemplate({
      name: ctx.input.name,
      subject: ctx.input.subject,
      body: ctx.input.body,
      folder_id: ctx.input.folderId
    });

    return {
      output: {
        templateId: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        isAvailableForAllInboxes: template.is_available_for_all_inboxes
      },
      message: `Created message template **${template.name}**.`
    };
  });

export let updateMessageTemplate = SlateTool.create(spec, {
  name: 'Update Message Template',
  key: 'update_message_template',
  description: `Update an existing message template's name, subject, body, or folder.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('Updated name'),
      subject: z.string().optional().describe('Updated subject'),
      body: z.string().optional().describe('Updated body (HTML)'),
      folderId: z.string().optional().describe('Updated folder ID')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let template = await client.updateMessageTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      subject: ctx.input.subject,
      body: ctx.input.body,
      folder_id: ctx.input.folderId
    });

    return {
      output: {
        templateId: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        isAvailableForAllInboxes: template.is_available_for_all_inboxes
      },
      message: `Updated message template **${template.name}**.`
    };
  });

export let deleteMessageTemplate = SlateTool.create(spec, {
  name: 'Delete Message Template',
  key: 'delete_message_template',
  description: `Permanently delete a message template. Cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteMessageTemplate(ctx.input.templateId);

    return {
      output: { deleted: true },
      message: `Deleted message template ${ctx.input.templateId}.`
    };
  });
