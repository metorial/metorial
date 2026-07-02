import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateVersionSchema = z.object({
  versionId: z.string().describe('Template version ID'),
  name: z.string().describe('Version name'),
  subject: z.string().optional().describe('Email subject'),
  active: z.number().optional().describe('1 if active, 0 if inactive'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let templateSchema = z.object({
  templateId: z.string().describe('Template ID'),
  name: z.string().describe('Template name'),
  generation: z.string().optional().describe('Template generation (legacy or dynamic)'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  versions: z.array(templateVersionSchema).optional().describe('Template versions')
});

export let getTemplates = SlateTool.create(spec, {
  name: 'Get Templates',
  key: 'get_templates',
  description: `List all transactional and dynamic templates in your SendGrid account. Includes version information for each template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generations: z
        .enum(['legacy', 'dynamic', 'legacy,dynamic'])
        .optional()
        .describe('Filter by template generation type. Defaults to all.'),
      pageSize: z.number().optional().describe('Number of templates per page')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('Templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getTemplates(ctx.input.generations, ctx.input.pageSize);

    let templates = (result.templates || result.result || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      generation: t.generation || undefined,
      updatedAt: t.updated_at || undefined,
      versions: (t.versions || []).map((v: any) => ({
        versionId: v.id,
        name: v.name,
        subject: v.subject || undefined,
        active: v.active,
        updatedAt: v.updated_at || undefined
      }))
    }));

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** template(s).`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a single template by ID with all its versions and content details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to retrieve')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let t = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: t.id,
        name: t.name,
        generation: t.generation || undefined,
        updatedAt: t.updated_at || undefined,
        versions: (t.versions || []).map((v: any) => ({
          versionId: v.id,
          name: v.name,
          subject: v.subject || undefined,
          active: v.active,
          updatedAt: v.updated_at || undefined
        }))
      },
      message: `Retrieved template **${t.name}** (ID: ${t.id}) with ${(t.versions || []).length} version(s).`
    };
  })
  .build();

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new dynamic email template. Optionally create an initial version with subject, HTML content, and plain text content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      generation: z
        .enum(['legacy', 'dynamic'])
        .optional()
        .describe('Template type. Defaults to "dynamic".'),
      version: z
        .object({
          name: z.string().describe('Version name'),
          subject: z.string().optional().describe('Email subject line (supports Handlebars)'),
          htmlContent: z.string().optional().describe('HTML content (supports Handlebars)'),
          plainContent: z.string().optional().describe('Plain text content'),
          active: z.boolean().optional().describe('Set as active version')
        })
        .optional()
        .describe('Initial template version to create')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let template = await client.createTemplate(ctx.input.name, ctx.input.generation);

    let versions: any[] = [];
    if (ctx.input.version) {
      let version = await client.createTemplateVersion(template.id, {
        name: ctx.input.version.name,
        subject: ctx.input.version.subject,
        htmlContent: ctx.input.version.htmlContent,
        plainContent: ctx.input.version.plainContent,
        active: ctx.input.version.active ? 1 : 0
      });
      versions.push({
        versionId: version.id,
        name: version.name,
        subject: version.subject || undefined,
        active: version.active,
        updatedAt: version.updated_at || undefined
      });
    }

    return {
      output: {
        templateId: template.id,
        name: template.name,
        generation: template.generation || undefined,
        updatedAt: template.updated_at || undefined,
        versions
      },
      message: `Created template **${template.name}** (ID: ${template.id})${versions.length ? ' with initial version' : ''}.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete a template and all its versions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the template was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { success: true },
      message: `Deleted template ${ctx.input.templateId}.`
    };
  })
  .build();
