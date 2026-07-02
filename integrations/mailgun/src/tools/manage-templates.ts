import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { mailgunServiceError } from '../lib/errors';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.string().optional().describe('Template ID'),
  name: z.string().describe('Template name'),
  description: z.string().optional().describe('Template description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  version: z
    .object({
      tag: z.string().describe('Version tag'),
      content: z.string().optional().describe('Template content (HTML/text)'),
      engine: z.string().optional().describe('Template engine'),
      active: z.boolean().optional().describe('Whether this version is active'),
      comment: z.string().optional().describe('Version comment'),
      createdAt: z.string().optional().describe('Version creation timestamp')
    })
    .optional()
    .describe('Active template version')
});

let templateVersionSchema = z.object({
  tag: z.string().describe('Version tag'),
  content: z.string().optional().describe('Template content'),
  engine: z.string().optional().describe('Template engine'),
  active: z.boolean().optional().describe('Whether this version is active'),
  comment: z.string().optional().describe('Version comment'),
  createdAt: z.string().optional().describe('Version creation timestamp')
});

// ==================== List Templates ====================

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all email templates for a domain. Templates are reusable email content with variable substitution support.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to list templates for'),
      limit: z.number().optional().describe('Maximum number of templates to return (max 100)'),
      skip: z.number().optional().describe('Number of templates to skip for pagination')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listTemplates(ctx.input.domain, {
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let templates = (result.items || []).map(t => ({
      templateId: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
      version: t.version
        ? {
            tag: t.version.tag,
            content: t.version.template,
            engine: t.version.engine,
            active: t.version.active,
            comment: t.version.comment,
            createdAt: t.version.createdAt
          }
        : undefined
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s) for domain **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Get Template ====================

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Get a specific email template with its active version content. Use to review template content and configuration before sending.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template to retrieve')
    })
  )
  .output(
    z.object({
      template: templateSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getTemplate(ctx.input.domain, ctx.input.templateName, true);

    let t = result.template;
    return {
      output: {
        template: {
          templateId: t.id,
          name: t.name,
          description: t.description,
          createdAt: t.createdAt,
          version: t.version
            ? {
                tag: t.version.tag,
                content: t.version.template,
                engine: t.version.engine,
                active: t.version.active,
                comment: t.version.comment,
                createdAt: t.version.createdAt
              }
            : undefined
        }
      },
      message: `Retrieved template **${t.name}**.`
    };
  })
  .build();

// ==================== Create Template ====================

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new email template for a domain. Optionally include initial content which creates the first version automatically.
Templates support Handlebars variable substitution with helpers like \`if\`, \`unless\`, \`each\`, and \`with\`.`,
  constraints: [
    'Maximum 100 templates per domain.',
    'Maximum 40 versions per template.',
    'Maximum 100KB per template version.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      name: z.string().describe('Template name (will be lowercased)'),
      description: z.string().optional().describe('Template description'),
      content: z
        .string()
        .optional()
        .describe(
          'Initial template content (HTML or text). Creates the first version if provided.'
        ),
      versionTag: z
        .string()
        .optional()
        .describe('Version tag for the initial version (default: "initial")'),
      comment: z.string().optional().describe('Comment for the initial version')
    })
  )
  .output(
    z.object({
      template: templateSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createTemplate(ctx.input.domain, {
      name: ctx.input.name,
      description: ctx.input.description,
      template: ctx.input.content,
      tag: ctx.input.versionTag,
      comment: ctx.input.comment
    });

    let t = result.template;
    return {
      output: {
        template: {
          templateId: t.id,
          name: t.name,
          description: t.description,
          createdAt: t.createdAt,
          version: t.version
            ? {
                tag: t.version.tag,
                content: t.version.template,
                engine: t.version.engine,
                active: t.version.active,
                comment: t.version.comment,
                createdAt: t.version.createdAt
              }
            : undefined
        }
      },
      message: `Template **${t.name}** created for domain **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Update Template ====================

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update a domain-level Mailgun template's metadata. Use template version tools to update content or active version.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template to update'),
      description: z.string().optional().describe('Updated template description')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.description === undefined) {
      throw mailgunServiceError('Provide a description to update the template metadata.');
    }

    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.updateTemplate(ctx.input.domain, ctx.input.templateName, {
      description: ctx.input.description
    });

    return {
      output: { success: true },
      message: `Updated template **${ctx.input.templateName}**.`
    };
  })
  .build();

// ==================== Delete Template ====================

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete an email template and all its versions permanently.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteTemplate(ctx.input.domain, ctx.input.templateName);

    return {
      output: { success: true },
      message: `Template **${ctx.input.templateName}** deleted from domain **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Create Template Version ====================

export let createTemplateVersion = SlateTool.create(spec, {
  name: 'Create Template Version',
  key: 'create_template_version',
  description: `Create a new version of an existing template. Templates support versioning to allow content changes while preserving previous versions.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template'),
      content: z.string().describe('Template content (HTML or text)'),
      tag: z.string().describe('Version tag identifier'),
      comment: z.string().optional().describe('Version comment'),
      active: z.boolean().optional().describe('Whether to set this version as the active one')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.createTemplateVersion(ctx.input.domain, ctx.input.templateName, {
      template: ctx.input.content,
      tag: ctx.input.tag,
      comment: ctx.input.comment,
      active: ctx.input.active
    });

    return {
      output: { success: true },
      message: `Version **${ctx.input.tag}** created for template **${ctx.input.templateName}**.`
    };
  })
  .build();

// ==================== List Template Versions ====================

export let listTemplateVersions = SlateTool.create(spec, {
  name: 'List Template Versions',
  key: 'list_template_versions',
  description: `List versions for a domain-level Mailgun template. Use before selecting, updating, activating, or deleting a specific version.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template'),
      page: z
        .enum(['first', 'last', 'next', 'previous'])
        .optional()
        .describe('Page to retrieve'),
      limit: z.number().optional().describe('Number of versions to retrieve (max 100)'),
      pivot: z.string().optional().describe('Pagination pivot token')
    })
  )
  .output(
    z.object({
      versions: z.array(templateVersionSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listTemplateVersions(ctx.input.domain, ctx.input.templateName, {
      page: ctx.input.page,
      limit: ctx.input.limit,
      pivot: ctx.input.pivot
    });

    let versions = (result.template.versions || []).map(version => ({
      tag: version.tag,
      content: version.template,
      engine: version.engine,
      active: version.active,
      comment: version.comment,
      createdAt: version.createdAt
    }));

    return {
      output: { versions },
      message: `Found **${versions.length}** version(s) for template **${ctx.input.templateName}**.`
    };
  })
  .build();

// ==================== Get Template Version ====================

export let getTemplateVersion = SlateTool.create(spec, {
  name: 'Get Template Version',
  key: 'get_template_version',
  description: `Get a specific version of a domain-level Mailgun template, including its content and active status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template'),
      tag: z.string().describe('Version tag')
    })
  )
  .output(
    z.object({
      version: templateVersionSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getTemplateVersion(
      ctx.input.domain,
      ctx.input.templateName,
      ctx.input.tag
    );
    let version = result.template.version;

    if (!version) {
      throw mailgunServiceError(
        `Mailgun did not return version ${ctx.input.tag} for template ${ctx.input.templateName}.`
      );
    }

    return {
      output: {
        version: {
          tag: version.tag,
          content: version.template,
          engine: version.engine,
          active: version.active,
          comment: version.comment,
          createdAt: version.createdAt
        }
      },
      message: `Retrieved version **${ctx.input.tag}** for template **${ctx.input.templateName}**.`
    };
  })
  .build();

// ==================== Update Template Version ====================

export let updateTemplateVersion = SlateTool.create(spec, {
  name: 'Update Template Version',
  key: 'update_template_version',
  description: `Update a domain-level Mailgun template version's content, comment, or active status.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template'),
      tag: z.string().describe('Version tag to update'),
      content: z.string().optional().describe('Updated template content'),
      comment: z.string().optional().describe('Updated version comment'),
      active: z.boolean().optional().describe('Whether this version should be active')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.content === undefined &&
      ctx.input.comment === undefined &&
      ctx.input.active === undefined
    ) {
      throw mailgunServiceError('Provide at least one template version field to update.');
    }

    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.updateTemplateVersion(
      ctx.input.domain,
      ctx.input.templateName,
      ctx.input.tag,
      {
        template: ctx.input.content,
        comment: ctx.input.comment,
        active: ctx.input.active
      }
    );

    return {
      output: { success: true },
      message: `Updated version **${ctx.input.tag}** for template **${ctx.input.templateName}**.`
    };
  })
  .build();

// ==================== Delete Template Version ====================

export let deleteTemplateVersion = SlateTool.create(spec, {
  name: 'Delete Template Version',
  key: 'delete_template_version',
  description: `Delete a specific version from a Mailgun domain-level template.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      templateName: z.string().describe('Name of the template'),
      tag: z.string().describe('Version tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteTemplateVersion(
      ctx.input.domain,
      ctx.input.templateName,
      ctx.input.tag
    );

    return {
      output: { success: true },
      message: `Deleted version **${ctx.input.tag}** from template **${ctx.input.templateName}**.`
    };
  })
  .build();
