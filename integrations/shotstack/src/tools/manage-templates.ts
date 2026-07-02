import { SlateTool } from 'slates';
import { z } from 'zod';
import { EditClient } from '../lib/client';
import { spec } from '../spec';

export let createTemplateTool = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Save a reusable edit configuration as a template. Templates can include merge field placeholders for dynamic content substitution at render time.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the template'),
      template: z
        .record(z.string(), z.any())
        .describe(
          'The edit object (same format as Render Video input with timeline and output)'
        )
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      message: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.createTemplate(ctx.input.name, ctx.input.template);

    return {
      output: {
        templateId: result.response.id,
        message: result.response.message
      },
      message: `Template **${ctx.input.name}** created with ID **${result.response.id}**.`
    };
  })
  .build();

export let listTemplatesTool = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a list of all saved templates. Returns template IDs, names, and timestamps.`,
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
            templateId: z.string().describe('Template ID'),
            name: z.string().describe('Template name'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.listTemplates();

    let templates = (result.response?.data || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      created: t.created,
      updated: t.updated
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();

export let getTemplateTool = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a template's full details including the edit configuration. Use this to inspect or duplicate a template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template ID to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID'),
      name: z.string().describe('Template name'),
      template: z.record(z.string(), z.any()).describe('The full edit configuration object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.getTemplate(ctx.input.templateId);

    let data = result.response;

    return {
      output: {
        templateId: data.id,
        name: data.name,
        template: data.template
      },
      message: `Retrieved template **${data.name}** (${data.id}).`
    };
  })
  .build();

export let updateTemplateTool = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing template's name and/or edit configuration.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template ID to update'),
      name: z.string().describe('Updated template name'),
      template: z.record(z.string(), z.any()).describe('Updated edit configuration object')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID'),
      message: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.updateTemplate(
      ctx.input.templateId,
      ctx.input.name,
      ctx.input.template
    );

    return {
      output: {
        templateId: result.response.id,
        message: result.response.message
      },
      message: `Template **${ctx.input.templateId}** updated.`
    };
  })
  .build();

export let deleteTemplateTool = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a saved template.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { success: true },
      message: `Template **${ctx.input.templateId}** deleted.`
    };
  })
  .build();

export let renderTemplateTool = SlateTool.create(spec, {
  name: 'Render Template',
  key: 'render_template',
  description: `Render a previously saved template. Optionally provide merge field replacements to personalize the output. Use this for mass video personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The template ID to render'),
      merge: z
        .array(
          z.object({
            find: z.string().describe('The placeholder string to find'),
            replace: z.string().describe('The replacement value')
          })
        )
        .optional()
        .describe('Merge field replacements for dynamic content')
    })
  )
  .output(
    z.object({
      renderId: z.string().describe('ID of the queued render job'),
      message: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let result = await client.renderTemplate(ctx.input.templateId, ctx.input.merge);

    return {
      output: {
        renderId: result.response.id,
        message: result.response.message
      },
      message: `Template render queued with ID **${result.response.id}**. Use the "Get Render Status" tool to check progress.`
    };
  })
  .build();
