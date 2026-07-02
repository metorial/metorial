import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { twilioSendGridServiceError } from '../lib/errors';
import { spec } from '../spec';

let templateVersionSchema = z.object({
  versionId: z.string().describe('Template version ID'),
  name: z.string().describe('Version name'),
  subject: z.string().optional().describe('Email subject'),
  htmlContent: z.string().optional().describe('HTML content'),
  plainContent: z.string().optional().describe('Plain text content'),
  active: z.number().optional().describe('1 if active, 0 if inactive'),
  editor: z.string().optional().describe('Editor type'),
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

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Rename an existing transactional template. To change template content, use Manage Template Version to create, update, activate, or delete a version.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to update'),
      name: z.string().describe('New template name')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let template = await client.updateTemplate(ctx.input.templateId, ctx.input.name);

    return {
      output: {
        templateId: template.id,
        name: template.name,
        generation: template.generation || undefined,
        updatedAt: template.updated_at || undefined,
        versions: (template.versions || []).map((v: any) => ({
          versionId: v.id,
          name: v.name,
          subject: v.subject || undefined,
          htmlContent: v.html_content || undefined,
          plainContent: v.plain_content || undefined,
          active: v.active,
          editor: v.editor || undefined,
          updatedAt: v.updated_at || undefined
        }))
      },
      message: `Renamed template **${template.name}** (ID: ${template.id}).`
    };
  })
  .build();

export let manageTemplateVersion = SlateTool.create(spec, {
  name: 'Manage Template Version',
  key: 'manage_template_version',
  description: `Create, retrieve, update, activate, or delete a transactional template version. Versions hold the subject, HTML, and plain text content used by dynamic templates.`,
  instructions: [
    'For action "create", provide templateId, name, and at least one content or subject field.',
    'For actions "get", "activate", and "delete", provide templateId and versionId.',
    'For action "update", provide templateId, versionId, and at least one editable field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'activate', 'delete'])
        .describe('Template version operation to perform'),
      templateId: z.string().describe('Template ID that owns the version'),
      versionId: z
        .string()
        .optional()
        .describe('Version ID. Required for get, update, activate, and delete.'),
      name: z
        .string()
        .optional()
        .describe('Version name. Required for create; optional for update.'),
      subject: z.string().optional().describe('Email subject for create or update'),
      htmlContent: z.string().optional().describe('HTML content for create or update'),
      plainContent: z.string().optional().describe('Plain text content for create or update'),
      active: z
        .boolean()
        .optional()
        .describe('Whether this version should be active for create or update'),
      testData: z.string().optional().describe('JSON string of test data for the template')
    })
  )
  .output(
    z.object({
      version: templateVersionSchema.optional().describe('Version returned by SendGrid'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let version: any | undefined;

    let mapVersion = (v: any) => ({
      versionId: v.id,
      name: v.name,
      subject: v.subject || undefined,
      htmlContent: v.html_content || undefined,
      plainContent: v.plain_content || undefined,
      active: v.active,
      editor: v.editor || undefined,
      updatedAt: v.updated_at || undefined
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name) {
          throw twilioSendGridServiceError('name is required to create a template version.');
        }
        if (!ctx.input.subject && !ctx.input.htmlContent && !ctx.input.plainContent) {
          throw twilioSendGridServiceError(
            'Provide subject, htmlContent, or plainContent to create a template version.'
          );
        }
        version = await client.createTemplateVersion(ctx.input.templateId, {
          name: ctx.input.name,
          subject: ctx.input.subject,
          htmlContent: ctx.input.htmlContent,
          plainContent: ctx.input.plainContent,
          active: ctx.input.active ? 1 : 0,
          testData: ctx.input.testData
        });
        break;
      }
      case 'get': {
        if (!ctx.input.versionId) {
          throw twilioSendGridServiceError('versionId is required to get a template version.');
        }
        version = await client.getTemplateVersion(ctx.input.templateId, ctx.input.versionId);
        break;
      }
      case 'update': {
        if (!ctx.input.versionId) {
          throw twilioSendGridServiceError(
            'versionId is required to update a template version.'
          );
        }
        if (
          !ctx.input.name &&
          !ctx.input.subject &&
          !ctx.input.htmlContent &&
          !ctx.input.plainContent &&
          ctx.input.active === undefined &&
          !ctx.input.testData
        ) {
          throw twilioSendGridServiceError(
            'Provide at least one field to update a template version.'
          );
        }
        version = await client.updateTemplateVersion(
          ctx.input.templateId,
          ctx.input.versionId,
          {
            name: ctx.input.name,
            subject: ctx.input.subject,
            htmlContent: ctx.input.htmlContent,
            plainContent: ctx.input.plainContent,
            active: ctx.input.active === undefined ? undefined : ctx.input.active ? 1 : 0,
            testData: ctx.input.testData
          }
        );
        break;
      }
      case 'activate': {
        if (!ctx.input.versionId) {
          throw twilioSendGridServiceError(
            'versionId is required to activate a template version.'
          );
        }
        version = await client.activateTemplateVersion(
          ctx.input.templateId,
          ctx.input.versionId
        );
        break;
      }
      case 'delete': {
        if (!ctx.input.versionId) {
          throw twilioSendGridServiceError(
            'versionId is required to delete a template version.'
          );
        }
        await client.deleteTemplateVersion(ctx.input.templateId, ctx.input.versionId);
        return {
          output: { success: true },
          message: `Deleted version ${ctx.input.versionId} from template ${ctx.input.templateId}.`
        };
      }
    }

    return {
      output: {
        version: version ? mapVersion(version) : undefined,
        success: true
      },
      message: `Template version ${ctx.input.action} operation completed for template ${ctx.input.templateId}.`
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
