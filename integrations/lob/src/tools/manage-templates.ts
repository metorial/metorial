import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateId: z.string().describe('Unique template ID'),
  description: z.string().optional().nullable().describe('Template description'),
  publishedVersionId: z
    .string()
    .optional()
    .nullable()
    .describe('Currently published version ID'),
  metadata: z.record(z.string(), z.string()).optional().nullable().describe('Custom metadata'),
  dateCreated: z.string().optional().nullable().describe('Creation date'),
  dateModified: z.string().optional().nullable().describe('Last modification date')
});

let mapTemplate = (data: any) => ({
  templateId: data.id,
  description: data.description ?? null,
  publishedVersionId: data.published_version?.id ?? null,
  metadata: data.metadata ?? null,
  dateCreated: data.date_created ?? null,
  dateModified: data.date_modified ?? null
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable HTML template for mail pieces. Templates support merge variables (e.g., \`{{name}}\`) for dynamic personalization. Use templates across postcards, letters, self-mailers, and checks instead of passing HTML directly.`,
  instructions: [
    'Use {{variable_name}} syntax in your HTML for merge variables.',
    'Templates can be referenced by their ID (tmpl_) when creating mail pieces.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      html: z
        .string()
        .describe('HTML content of the template. Use {{variable}} for merge variables.'),
      description: z.string().optional().describe('Description of the template'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      engine: z
        .enum(['legacy', 'handlebars'])
        .optional()
        .describe('Template engine. Defaults to legacy.')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTemplate(ctx.input);
    let mapped = mapTemplate(result);
    return {
      output: mapped,
      message: `Created template **${mapped.templateId}**${mapped.description ? ` — ${mapped.description}` : ''}`
    };
  });

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a specific template and its published version details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The Lob template ID (starts with "tmpl_")')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTemplate(ctx.input.templateId);
    return {
      output: mapTemplate(result),
      message: `Retrieved template **${result.id}**`
    };
  });

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List saved templates with optional filtering. Returns a paginated list of templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of templates to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of templates to skip'),
      metadata: z.record(z.string(), z.string()).optional().describe('Filter by metadata')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutputSchema).describe('List of templates'),
      totalCount: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTemplates({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      metadata: ctx.input.metadata
    });
    let templates = (result.data || []).map(mapTemplate);
    return {
      output: {
        templates,
        totalCount: result.total_count ?? result.count ?? templates.length
      },
      message: `Found **${templates.length}** templates`
    };
  });

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update a template's description or published version. To update the HTML content, create a new template version and then set it as the published version.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The Lob template ID to update'),
      description: z.string().optional().describe('New description'),
      publishedVersion: z
        .string()
        .optional()
        .describe('Version ID to publish (starts with "vrsn_")')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateTemplate(ctx.input.templateId, {
      description: ctx.input.description,
      publishedVersion: ctx.input.publishedVersion
    });
    return {
      output: mapTemplate(result),
      message: `Updated template **${result.id}**`
    };
  });

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a template and all its versions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The Lob template ID to delete')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the deleted template'),
      deleted: z.boolean().describe('Whether it was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteTemplate(ctx.input.templateId);
    return {
      output: {
        templateId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Deleted template **${ctx.input.templateId}**`
    };
  });

export let createTemplateVersion = SlateTool.create(spec, {
  name: 'Create Template Version',
  key: 'create_template_version',
  description: `Create a new version of an existing template. New versions allow you to update designs without changing your integration code. Set the new version as published to make it active.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The parent template ID'),
      html: z.string().describe('HTML content for this version'),
      description: z.string().optional().describe('Description of this version'),
      engine: z.enum(['legacy', 'handlebars']).optional().describe('Template engine')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Unique version ID'),
      templateId: z.string().describe('Parent template ID'),
      description: z.string().optional().nullable().describe('Version description'),
      html: z.string().describe('HTML content'),
      dateCreated: z.string().optional().nullable().describe('Creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTemplateVersion(ctx.input.templateId, {
      html: ctx.input.html,
      description: ctx.input.description,
      engine: ctx.input.engine
    });
    return {
      output: {
        versionId: result.id,
        templateId: result.template_id ?? ctx.input.templateId,
        description: result.description ?? null,
        html: result.html,
        dateCreated: result.date_created ?? null
      },
      message: `Created version **${result.id}** for template **${ctx.input.templateId}**`
    };
  });
