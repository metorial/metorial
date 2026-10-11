import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateVariableInputSchema = z.object({
  key: z
    .string()
    .describe(
      'Variable key used in the template as {{{KEY}}}. Reserved: FIRST_NAME, LAST_NAME, EMAIL, RESEND_UNSUBSCRIBE_URL, contact, this.'
    ),
  type: z.enum(['string', 'number']).describe('Variable type.'),
  fallbackValue: z
    .union([z.string(), z.number()])
    .optional()
    .describe(
      'Fallback value matching the variable type. Without one, the value must be supplied when sending.'
    )
});

let templateVariablesInputSchema = z
  .array(templateVariableInputSchema)
  .describe('Variables used in the template HTML (max 50).');

let templateVariableOutputSchema = z.object({
  variableId: z.string().optional().describe('Variable ID.'),
  key: z.string().describe('Variable key.'),
  type: z.string().optional().describe('Variable type.'),
  fallbackValue: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .describe('Fallback value.')
});

let templateOutputSchema = z.object({
  templateId: z.string().describe('ID of the template.'),
  name: z.string().optional().describe('Template name.'),
  alias: z.string().optional().nullable().describe('Template alias.'),
  status: z.string().optional().describe('Template status (draft or published).'),
  from: z.string().optional().nullable().describe('Default sender address.'),
  subject: z.string().optional().nullable().describe('Default subject.'),
  replyTo: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .nullable()
    .describe('Default reply-to address(es).'),
  html: z.string().optional().nullable().describe('HTML content.'),
  text: z.string().optional().nullable().describe('Plain text content.'),
  variables: z
    .array(templateVariableOutputSchema)
    .optional()
    .nullable()
    .describe('Variables declared on the template.'),
  currentVersionId: z.string().optional().nullable().describe('Current version ID.'),
  hasUnpublishedVersions: z
    .boolean()
    .optional()
    .describe('Whether the template has changes that are not published yet.'),
  publishedAt: z.string().optional().nullable().describe('Last publish timestamp.'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  updatedAt: z.string().optional().describe('Last update timestamp.')
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable email template. Templates must be published before they can be used for sending. Use the **Publish Template** tool after creating.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Template name.'),
      html: z.string().describe('HTML content of the template.'),
      alias: z.string().optional().describe('Template alias for alternative lookup.'),
      from: z.string().optional().describe('Default sender address.'),
      subject: z.string().optional().describe('Default subject line.'),
      replyTo: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Default reply-to address(es).'),
      text: z.string().optional().describe('Plain text version.'),
      variables: templateVariablesInputSchema
        .optional()
        .describe(
          'Variables used in the template HTML (max 50). Declare every {{{KEY}}} placeholder here.'
        )
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTemplate({
      name: ctx.input.name,
      html: ctx.input.html,
      alias: ctx.input.alias,
      from: ctx.input.from,
      subject: ctx.input.subject,
      replyTo: ctx.input.replyTo,
      text: ctx.input.text,
      variables: ctx.input.variables
    });

    return {
      output: { templateId: result.id },
      message: `Template **${ctx.input.name}** created with ID \`${result.id}\`. Remember to publish it before use.`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a template's details by ID or alias, including content, status, and variables.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateIdOrAlias: z.string().describe('Template ID or alias.')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.getTemplate(ctx.input.templateIdOrAlias);

    return {
      output: {
        templateId: t.id,
        name: t.name,
        alias: t.alias,
        status: t.status,
        from: t.from,
        subject: t.subject,
        replyTo: t.reply_to,
        html: t.html,
        text: t.text,
        variables: t.variables?.map((variable: any) => ({
          variableId: variable.id,
          key: variable.key,
          type: variable.type,
          fallbackValue: variable.fallback_value
        })),
        currentVersionId: t.current_version_id,
        hasUnpublishedVersions: t.has_unpublished_versions,
        publishedAt: t.published_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      },
      message: `Template **${t.name}** — status: **${t.status}**.`
    };
  })
  .build();

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing template's content, name, or defaults. Updated templates must be re-published.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID or alias of the template to update.'),
      name: z.string().optional().describe('Updated name.'),
      html: z.string().optional().describe('Updated HTML content.'),
      alias: z.string().optional().describe('Updated alias.'),
      from: z.string().optional().describe('Updated default sender address.'),
      subject: z.string().optional().describe('Updated default subject.'),
      replyTo: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Updated reply-to address(es).'),
      text: z.string().optional().describe('Updated plain text content.'),
      variables: templateVariablesInputSchema
        .optional()
        .describe('Updated list of variables used in the template HTML (max 50).')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the updated template.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      html: ctx.input.html,
      alias: ctx.input.alias,
      from: ctx.input.from,
      subject: ctx.input.subject,
      replyTo: ctx.input.replyTo,
      text: ctx.input.text,
      variables: ctx.input.variables
    });

    return {
      output: { templateId: result.id },
      message: `Template \`${result.id}\` updated. Remember to re-publish if needed.`
    };
  })
  .build();

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all email templates with their name, status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID.'),
            name: z.string().describe('Template name.'),
            alias: z.string().optional().nullable().describe('Template alias.'),
            status: z.string().describe('Status (draft or published).'),
            publishedAt: z.string().optional().nullable().describe('Last publish timestamp.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            updatedAt: z.string().optional().describe('Last update timestamp.')
          })
        )
        .describe('List of templates.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTemplates({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let templates = (result.data || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      alias: t.alias,
      status: t.status,
      publishedAt: t.published_at,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: {
        templates,
        hasMore: result.has_more ?? false
      },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();

export let publishTemplate = SlateTool.create(spec, {
  name: 'Publish Template',
  key: 'publish_template',
  description: `Publish a template to make it available for sending emails. Templates must be published before use.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdOrAlias: z.string().describe('Template ID or alias to publish.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the published template.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.publishTemplate(ctx.input.templateIdOrAlias);

    return {
      output: { templateId: result.id },
      message: `Template \`${result.id}\` has been **published**.`
    };
  })
  .build();

export let duplicateTemplate = SlateTool.create(spec, {
  name: 'Duplicate Template',
  key: 'duplicate_template',
  description: `Duplicate an existing Resend template so it can be edited without changing the original.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID or alias to duplicate.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the duplicated template.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.duplicateTemplate(ctx.input.templateId);

    return {
      output: { templateId: result.id },
      message: `Template \`${ctx.input.templateId}\` duplicated as \`${result.id}\`.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Permanently delete an email template by ID or alias.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdOrAlias: z.string().describe('Template ID or alias to delete.')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the deleted template.'),
      deleted: z.boolean().describe('Whether the template was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteTemplate(ctx.input.templateIdOrAlias);

    return {
      output: {
        templateId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Template \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
