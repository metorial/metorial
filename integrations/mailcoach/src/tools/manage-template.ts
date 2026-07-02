import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateUuid: z.string().describe('Unique identifier of the template'),
  name: z.string().describe('Template name'),
  html: z.string().nullable().describe('HTML content of the template'),
  structuredHtml: z.string().nullable().describe('Structured HTML content'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Create, update, retrieve, list, or delete email templates. Templates define reusable HTML structures with placeholder fields for campaigns.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      templateUuid: z
        .string()
        .optional()
        .describe('UUID of the template (required for get, update, delete)'),
      name: z.string().optional().describe('Template name (required for create and update)'),
      html: z.string().optional().describe('HTML content for the template'),
      structuredHtml: z.string().optional().describe('Structured HTML content'),
      search: z.string().optional().describe('Search term for listing templates'),
      page: z.number().optional().describe('Page number for pagination (list only)')
    })
  )
  .output(
    z.object({
      template: templateOutputSchema
        .nullable()
        .describe('Single template result (for get, create, update)'),
      templates: z
        .array(templateOutputSchema)
        .nullable()
        .describe('List of templates (for list action)'),
      totalCount: z.number().nullable().describe('Total number of templates (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTemplates({
        search: ctx.input.search,
        page: ctx.input.page
      });
      let templates = (result.data || []).map(mapTemplate);
      return {
        output: {
          template: null,
          templates,
          totalCount: result.meta?.total ?? templates.length
        },
        message: `Found **${templates.length}** template(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.templateUuid) throw new Error('templateUuid is required for get');
      let result = await client.getTemplate(ctx.input.templateUuid);
      return {
        output: { template: mapTemplate(result), templates: null, totalCount: null },
        message: `Retrieved template **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.templateUuid) throw new Error('templateUuid is required for delete');
      await client.deleteTemplate(ctx.input.templateUuid);
      return {
        output: { template: null, templates: null, totalCount: null },
        message: `Template **${ctx.input.templateUuid}** has been deleted.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let result = await client.createTemplate({
        name: ctx.input.name,
        html: ctx.input.html,
        structured_html: ctx.input.structuredHtml
      });
      return {
        output: { template: mapTemplate(result), templates: null, totalCount: null },
        message: `Template **${result.name}** has been created.`
      };
    }

    // update
    if (!ctx.input.templateUuid) throw new Error('templateUuid is required for update');
    if (!ctx.input.name) throw new Error('name is required for update');

    let result = await client.updateTemplate(ctx.input.templateUuid, {
      name: ctx.input.name,
      html: ctx.input.html,
      structured_html: ctx.input.structuredHtml
    });

    return {
      output: { template: mapTemplate(result), templates: null, totalCount: null },
      message: `Template **${result.name}** has been updated.`
    };
  });

let mapTemplate = (t: any) => ({
  templateUuid: t.uuid,
  name: t.name,
  html: t.html ?? null,
  structuredHtml: t.structured_html ?? null,
  createdAt: t.created_at,
  updatedAt: t.updated_at
});
