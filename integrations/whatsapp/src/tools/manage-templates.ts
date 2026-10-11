import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/components
let templateComponentDefinition = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']).describe('Component type'),
  format: z
    .enum(['TEXT', 'IMAGE', 'VIDEO', 'GIF', 'DOCUMENT', 'LOCATION'])
    .optional()
    .describe('Header format (required for HEADER type)'),
  text: z
    .string()
    .optional()
    .describe(
      'Component text content. Use {{1}}, {{2}}, etc. for positional variables, or {{variable_name}} when parameterFormat is "named"'
    ),
  example: z
    .any()
    .optional()
    .describe(
      'Meta template example object for dynamic variables, such as body_text, body_text_named_params, header_text, header_text_named_params, or header_handle'
    ),
  buttons: z
    .array(
      z.object({
        type: z
          .enum(['PHONE_NUMBER', 'URL', 'QUICK_REPLY', 'COPY_CODE'])
          .describe('Button type'),
        text: z
          .string()
          .optional()
          .describe('Button display text (required for every type except COPY_CODE)'),
        phoneNumber: z.string().optional().describe('Phone number (for PHONE_NUMBER type)'),
        url: z
          .string()
          .optional()
          .describe('URL (for URL type). Use {{1}} for dynamic suffix'),
        example: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe(
            'Example values for dynamic parts: an array of strings for URL buttons, or the example coupon code string (max 20 characters) for COPY_CODE buttons'
          )
      })
    )
    .optional()
    .describe('Buttons array (required for BUTTONS type)')
});

type TemplateComponentDefinition = z.infer<typeof templateComponentDefinition>;

let templateCategorySchema = z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']);

let parameterFormatSchema = z
  .enum(['named', 'positional'])
  .describe(
    'Variable format used in the template text: "positional" ({{1}}, {{2}}) or "named" ({{first_name}}). Meta defaults to positional.'
  );

let toApiTemplateComponents = (components: TemplateComponentDefinition[]) =>
  components.map(comp => {
    let mapped: Record<string, any> = { type: comp.type };
    if (comp.format) mapped.format = comp.format;
    if (comp.text) mapped.text = comp.text;
    if (comp.example !== undefined) mapped.example = comp.example;
    if (comp.buttons) {
      mapped.buttons = comp.buttons.map(btn => {
        if (btn.type !== 'COPY_CODE' && !btn.text) {
          throw createApiServiceError(`text is required for ${btn.type} template buttons.`);
        }
        let b: Record<string, any> = { type: btn.type };
        if (btn.text) b.text = btn.text;
        if (btn.phoneNumber) b.phone_number = btn.phoneNumber;
        if (btn.url) b.url = btn.url;
        if (btn.example !== undefined) b.example = btn.example;
        return b;
      });
    }
    return mapped;
  });

let createClient = (ctx: {
  auth: { token: string };
  config: { phoneNumberId: string; wabaId: string; apiVersion: string };
}) =>
  new Client({
    token: ctx.auth.token,
    phoneNumberId: ctx.config.phoneNumberId,
    wabaId: ctx.config.wabaId,
    apiVersion: ctx.config.apiVersion
  });

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List message templates in your WhatsApp Business Account. Returns template IDs, names, statuses, categories, languages, parameter formats, rejection reasons, and component definitions.
Filter by name, status, category, or language, and use pagination to browse through large template libraries.`,
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
        .default(20)
        .describe('Number of templates to return (default 20)'),
      afterCursor: z
        .string()
        .optional()
        .describe('Pagination cursor for the next page of results'),
      name: z.string().optional().describe('Only return templates matching this name'),
      status: z
        .enum([
          'APPROVED',
          'PENDING',
          'REJECTED',
          'PAUSED',
          'DISABLED',
          'IN_APPEAL',
          'PENDING_DELETION',
          'DELETED',
          'LIMIT_EXCEEDED',
          'ARCHIVED'
        ])
        .optional()
        .describe('Only return templates with this review status'),
      category: templateCategorySchema
        .optional()
        .describe('Only return templates in this category'),
      language: z
        .string()
        .optional()
        .describe('Only return templates in this language code (e.g. en_US)')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string(),
          name: z.string(),
          status: z.string(),
          category: z.string(),
          language: z.string(),
          parameterFormat: z
            .string()
            .optional()
            .describe('Variable format: NAMED or POSITIONAL'),
          rejectedReason: z
            .string()
            .optional()
            .describe('Reason Meta rejected the template, if any'),
          qualityScore: z
            .string()
            .optional()
            .describe('Template quality score (GREEN, YELLOW, RED, UNKNOWN)'),
          components: z.any().optional()
        })
      ),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page, if more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor,
      name: ctx.input.name,
      status: ctx.input.status,
      category: ctx.input.category,
      language: ctx.input.language
    });

    let templates = (result.data ?? []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      parameterFormat: t.parameter_format,
      rejectedReason:
        t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : undefined,
      qualityScore: t.quality_score?.score,
      components: t.components
    }));

    // Graph returns cursors on the last page too; only `paging.next` signals more results.
    let nextCursor = result.paging?.next ? result.paging?.cursors?.after : undefined;

    return {
      output: {
        templates,
        nextCursor
      },
      message: `Found **${templates.length}** template(s).${nextCursor ? ' More results available with pagination.' : ''}`
    };
  })
  .build();

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new WhatsApp message template. Templates must be approved by Meta before use. Most templates are reviewed by a machine learning process and approved in minutes; some may take up to 48 hours.
Templates have three categories: **MARKETING**, **UTILITY**, and **AUTHENTICATION**.`,
  instructions: [
    'Template names must be lowercase letters, digits, and underscores only (e.g. order_update)',
    'Use {{1}}, {{2}}, etc. for positional variables, or set parameterFormat to "named" and use {{variable_name}}',
    'Provide example values for variables: example.body_text for positional or example.body_text_named_params for named variables',
    'HEADER format can be TEXT, IMAGE, VIDEO, GIF, DOCUMENT, or LOCATION',
    'Each WABA can have up to 250 template names (each with multiple language translations)'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Template name (lowercase, underscores only)'),
      language: z.string().describe('Language code (e.g. en_US, es, pt_BR)'),
      category: templateCategorySchema.describe('Template category'),
      components: z
        .array(templateComponentDefinition)
        .describe('Template component definitions'),
      parameterFormat: parameterFormatSchema.optional(),
      allowCategoryChange: z
        .boolean()
        .optional()
        .describe('Allow Meta to reassign the category if needed')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the created template'),
      status: z.string().describe('Template approval status'),
      category: z.string().describe('Assigned template category')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createTemplate({
      name: ctx.input.name,
      language: ctx.input.language,
      category: ctx.input.category,
      components: toApiTemplateComponents(ctx.input.components),
      parameterFormat: ctx.input.parameterFormat,
      allowCategoryChange: ctx.input.allowCategoryChange
    });

    return {
      output: {
        templateId: result.id,
        status: result.status,
        category: result.category
      },
      message: `Created template **${ctx.input.name}** (${ctx.input.language}). Status: **${result.status}**. ID: \`${result.id}\``
    };
  })
  .build();

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Edit an existing WhatsApp message template by its template ID, for example to fix a rejected template and resubmit it for review. The provided components **replace all** existing components; the edited template goes back through Meta review.`,
  instructions: [
    'Use List Templates to find the template ID of the language version to edit',
    'Provide the complete set of components; omitted components are removed',
    'The category of an approved template cannot be changed'
  ],
  constraints: [
    'Only APPROVED, REJECTED, or PAUSED templates can be edited',
    'Approved templates can be edited up to 10 times per 30 days, and once per 24 hours'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('ID of the template to edit. Call List Templates to find it.'),
      components: z
        .array(templateComponentDefinition)
        .optional()
        .describe('New template component definitions; replaces all existing components'),
      category: templateCategorySchema
        .optional()
        .describe('New template category (not allowed for approved templates)'),
      parameterFormat: parameterFormatSchema.optional(),
      allowCategoryChange: z
        .boolean()
        .optional()
        .describe('Allow Meta to reassign the category if needed')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the edited template'),
      success: z.boolean().describe('Whether Meta accepted the edit')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.components && !ctx.input.category) {
      throw createApiServiceError('Provide components or category to update the template.');
    }

    let client = createClient(ctx);
    let result = await client.updateTemplate(ctx.input.templateId, {
      components: ctx.input.components
        ? toApiTemplateComponents(ctx.input.components)
        : undefined,
      category: ctx.input.category,
      parameterFormat: ctx.input.parameterFormat,
      allowCategoryChange: ctx.input.allowCategoryChange
    });

    return {
      output: {
        templateId: ctx.input.templateId,
        success: result.success === true
      },
      message: `Submitted edits to template \`${ctx.input.templateId}\` for review.`
    };
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a WhatsApp message template by name. Without a template ID this deletes the template and **all its language translations**; with a template ID it deletes only that language version.`,
  constraints: [
    'Deleting by name alone removes all language versions of that template',
    'After deleting an approved template, its name cannot be reused for 30 days'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z.string().describe('Name of the template to delete'),
      templateId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional template ID to delete only that language version. Call List Templates to find it.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.deleteTemplate(ctx.input.templateName, ctx.input.templateId);

    return {
      output: {
        success: result.success === true
      },
      message: ctx.input.templateId
        ? `Deleted template **${ctx.input.templateName}** (ID \`${ctx.input.templateId}\`).`
        : `Deleted template **${ctx.input.templateName}** and all its language translations.`
    };
  })
  .build();
