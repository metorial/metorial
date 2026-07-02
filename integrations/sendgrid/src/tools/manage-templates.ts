import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateVersionSchema = z.object({
  versionId: z.string().describe('Unique version identifier'),
  name: z.string().describe('Version name'),
  subject: z.string().optional().describe('Email subject for this version'),
  htmlContent: z.string().optional().describe('HTML content of the template version'),
  plainContent: z.string().optional().describe('Plain text content'),
  active: z.number().describe('1 if active, 0 if inactive'),
  editor: z.string().optional().describe('Editor type: code or design'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let templateSchema = z.object({
  templateId: z.string().describe('Unique template identifier'),
  name: z.string().describe('Template name'),
  generation: z.string().describe('Template generation: legacy or dynamic'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  versions: z.array(templateVersionSchema).optional().describe('Template versions')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve dynamic email templates. Returns template metadata and versions. Use this to browse available templates before sending template-based emails.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      generation: z
        .enum(['legacy', 'dynamic'])
        .optional()
        .describe('Filter by template generation. Defaults to "dynamic".'),
      pageSize: z.number().optional().describe('Number of templates per page (max 200)'),
      pageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of templates'),
      metadata: z
        .object({
          count: z.number().optional().describe('Total count of templates'),
          nextPageToken: z.string().optional().describe('Token for the next page')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.listTemplates({
      generations: ctx.input.generation,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let templates = (result.templates || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      generation: t.generation,
      updatedAt: t.updated_at,
      versions: (t.versions || []).map((v: any) => ({
        versionId: v.id,
        name: v.name,
        subject: v.subject,
        active: v.active,
        editor: v.editor,
        updatedAt: v.updated_at
      }))
    }));

    return {
      output: {
        templates,
        metadata: result._metadata
          ? {
              count: result._metadata.count,
              nextPageToken: result._metadata.next_page_token
            }
          : undefined
      },
      message: `Found **${templates.length}** template(s).`
    };
  });

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a single dynamic template by ID, including all its versions and content. Use this to inspect template details before sending or editing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
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
        generation: t.generation,
        updatedAt: t.updated_at,
        versions: (t.versions || []).map((v: any) => ({
          versionId: v.id,
          name: v.name,
          subject: v.subject,
          htmlContent: v.html_content,
          plainContent: v.plain_content,
          active: v.active,
          editor: v.editor,
          updatedAt: v.updated_at
        }))
      },
      message: `Retrieved template **${t.name}** (\`${t.id}\`) with ${(t.versions || []).length} version(s).`
    };
  });

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new dynamic email template. Optionally create the first version with subject, HTML content, and plain text content in the same operation.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the template'),
      generation: z
        .enum(['legacy', 'dynamic'])
        .optional()
        .describe('Template generation. Defaults to "dynamic".'),
      version: z
        .object({
          name: z.string().describe('Version name'),
          subject: z.string().optional().describe('Email subject using Handlebars syntax'),
          htmlContent: z.string().optional().describe('HTML content using Handlebars syntax'),
          plainContent: z.string().optional().describe('Plain text content'),
          editor: z
            .enum(['code', 'design'])
            .optional()
            .describe('Editor type. Defaults to "code".')
        })
        .optional()
        .describe('Initial template version to create alongside the template')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let t = await client.createTemplate(ctx.input.name, ctx.input.generation);

    let versions: any[] = [];
    if (ctx.input.version) {
      let v = await client.createTemplateVersion(t.id, ctx.input.version);
      versions.push({
        versionId: v.id,
        name: v.name,
        subject: v.subject,
        htmlContent: v.html_content,
        plainContent: v.plain_content,
        active: v.active,
        editor: v.editor,
        updatedAt: v.updated_at
      });
    }

    return {
      output: {
        templateId: t.id,
        name: t.name,
        generation: t.generation,
        updatedAt: t.updated_at,
        versions
      },
      message: `Created template **${t.name}** (\`${t.id}\`)${versions.length > 0 ? ' with initial version' : ''}.`
    };
  });

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update a template's name or manage template versions. Can rename the template, create new versions, or update existing version content.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      name: z.string().optional().describe('New name for the template'),
      createVersion: z
        .object({
          name: z.string().describe('Version name'),
          subject: z.string().optional().describe('Email subject'),
          htmlContent: z.string().optional().describe('HTML content'),
          plainContent: z.string().optional().describe('Plain text content'),
          active: z.number().optional().describe('1 for active, 0 for inactive'),
          editor: z.enum(['code', 'design']).optional().describe('Editor type')
        })
        .optional()
        .describe('New version to create'),
      updateVersion: z
        .object({
          versionId: z.string().describe('ID of the version to update'),
          name: z.string().optional().describe('New version name'),
          subject: z.string().optional().describe('New email subject'),
          htmlContent: z.string().optional().describe('New HTML content'),
          plainContent: z.string().optional().describe('New plain text content'),
          active: z.number().optional().describe('1 for active, 0 for inactive')
        })
        .optional()
        .describe('Version to update')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID'),
      name: z.string().describe('Template name'),
      version: templateVersionSchema.optional().describe('Created or updated version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let actions: string[] = [];

    let templateName = ctx.input.name;
    if (ctx.input.name) {
      let updated = await client.updateTemplate(ctx.input.templateId, ctx.input.name);
      templateName = updated.name;
      actions.push('renamed');
    }

    let version: any;
    if (ctx.input.createVersion) {
      let v = await client.createTemplateVersion(
        ctx.input.templateId,
        ctx.input.createVersion
      );
      version = {
        versionId: v.id,
        name: v.name,
        subject: v.subject,
        htmlContent: v.html_content,
        plainContent: v.plain_content,
        active: v.active,
        editor: v.editor,
        updatedAt: v.updated_at
      };
      actions.push('new version created');
    }

    if (ctx.input.updateVersion) {
      let { versionId, ...params } = ctx.input.updateVersion;
      let v = await client.updateTemplateVersion(ctx.input.templateId, versionId, params);
      version = {
        versionId: v.id,
        name: v.name,
        subject: v.subject,
        htmlContent: v.html_content,
        plainContent: v.plain_content,
        active: v.active,
        editor: v.editor,
        updatedAt: v.updated_at
      };
      actions.push('version updated');
    }

    if (!templateName) {
      let t = await client.getTemplate(ctx.input.templateId);
      templateName = t.name;
    }

    return {
      output: {
        templateId: ctx.input.templateId,
        name: templateName!,
        version
      },
      message: `Template \`${ctx.input.templateId}\` updated: ${actions.join(', ')}.`
    };
  });

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a dynamic template and all its versions, or delete a specific version of a template.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template'),
      versionId: z
        .string()
        .optional()
        .describe(
          'If provided, only delete this specific version instead of the entire template'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.versionId) {
      await client.deleteTemplateVersion(ctx.input.templateId, ctx.input.versionId);
      return {
        output: { deleted: true },
        message: `Deleted version \`${ctx.input.versionId}\` from template \`${ctx.input.templateId}\`.`
      };
    }

    await client.deleteTemplate(ctx.input.templateId);
    return {
      output: { deleted: true },
      message: `Deleted template \`${ctx.input.templateId}\` and all its versions.`
    };
  });
