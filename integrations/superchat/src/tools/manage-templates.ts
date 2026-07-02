import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().describe('Unique template identifier'),
  templateUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('Template name'),
  language: z.string().optional().describe('Template language code'),
  status: z.string().optional().describe('Template approval status'),
  content: z.record(z.string(), z.any()).optional().describe('Template content structure'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapTemplate = (tpl: any) => ({
  templateId: tpl.id,
  templateUrl: tpl.url,
  name: tpl.name,
  language: tpl.language,
  status: tpl.status,
  content: tpl.content,
  createdAt: tpl.created_at,
  updatedAt: tpl.updated_at
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all message templates in the workspace. Templates are primarily used for WhatsApp out-of-window messaging.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of templates to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of templates'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let templates = (result.results || []).map(mapTemplate);

    return {
      output: {
        templates,
        pagination: result.pagination
      },
      message: `Retrieved **${templates.length}** template(s).`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve details of a specific message template by its ID, including content structure and variables.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getTemplate(ctx.input.templateId);

    return {
      output: mapTemplate(result),
      message: `Retrieved template **${result.name || result.id}** (language: ${result.language}).`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a message template. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the deleted template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: ctx.input.templateId
      },
      message: `Template \`${ctx.input.templateId}\` deleted.`
    };
  })
  .build();
