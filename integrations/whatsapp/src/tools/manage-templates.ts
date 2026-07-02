import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateComponentDefinition = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']).describe('Component type'),
  format: z
    .enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'])
    .optional()
    .describe('Header format (required for HEADER type)'),
  text: z
    .string()
    .optional()
    .describe('Component text content. Use {{1}}, {{2}}, etc. for dynamic variables'),
  example: z
    .any()
    .optional()
    .describe(
      'Meta template example object for dynamic variables, such as body_text, header_text, or header_handle'
    ),
  buttons: z
    .array(
      z.object({
        type: z.enum(['PHONE_NUMBER', 'URL', 'QUICK_REPLY']).describe('Button type'),
        text: z.string().describe('Button display text'),
        phoneNumber: z.string().optional().describe('Phone number (for PHONE_NUMBER type)'),
        url: z
          .string()
          .optional()
          .describe('URL (for URL type). Use {{1}} for dynamic suffix'),
        example: z.array(z.string()).optional().describe('Example values for dynamic parts')
      })
    )
    .optional()
    .describe('Buttons array (required for BUTTONS type)')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List message templates in your WhatsApp Business Account. Returns template names, statuses, categories, languages, and component definitions.
Use pagination to browse through large template libraries.`,
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
        .describe('Pagination cursor for the next page of results')
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
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let templates = (result.data ?? []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      components: t.components
    }));

    let nextCursor = result.paging?.cursors?.after;

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
    'Template names must be lowercase with underscores only (e.g. order_update)',
    'Use {{1}}, {{2}}, etc. for dynamic variables in the body text',
    'HEADER format can be TEXT, IMAGE, VIDEO, DOCUMENT, or LOCATION',
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
      category: z
        .enum(['MARKETING', 'UTILITY', 'AUTHENTICATION'])
        .describe('Template category'),
      components: z
        .array(templateComponentDefinition)
        .describe('Template component definitions'),
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
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let apiComponents = ctx.input.components.map(comp => {
      let mapped: Record<string, any> = { type: comp.type };
      if (comp.format) mapped.format = comp.format;
      if (comp.text) mapped.text = comp.text;
      if (comp.example !== undefined) mapped.example = comp.example;
      if (comp.buttons) {
        mapped.buttons = comp.buttons.map(btn => {
          let b: Record<string, any> = { type: btn.type, text: btn.text };
          if (btn.phoneNumber) b.phone_number = btn.phoneNumber;
          if (btn.url) b.url = btn.url;
          if (btn.example) b.example = btn.example;
          return b;
        });
      }
      return mapped;
    });

    let result = await client.createTemplate({
      name: ctx.input.name,
      language: ctx.input.language,
      category: ctx.input.category,
      components: apiComponents,
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

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a WhatsApp message template by name. This deletes the template and **all its language translations**.`,
  constraints: ['Deleting a template removes all language versions of that template'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateName: z.string().describe('Name of the template to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteTemplate(ctx.input.templateName);

    return {
      output: {
        success: result.success === true
      },
      message: `Deleted template **${ctx.input.templateName}** and all its language translations.`
    };
  })
  .build();
