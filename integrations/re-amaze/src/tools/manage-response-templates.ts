import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { toNumericId } from '../lib/response';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.number().describe('Response template ID'),
  isPersonal: z
    .boolean()
    .optional()
    .describe('Whether this template is personal, when supplied by the provider'),
  name: z.string().describe('Template name'),
  templateBody: z.string().optional().describe('Template body content'),
  groupName: z.string().nullable().optional().describe('Template group name'),
  groupId: z.number().nullable().optional().describe('Template group ID')
});

export let listResponseTemplates = SlateTool.create(spec, {
  name: 'List Response Templates',
  key: 'list_response_templates',
  description: `List and search pre-written response templates. Use the query parameter to search by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Keyword search for templates'),
      page: z.number().int().min(1).optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of response templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listResponseTemplates({
      q: ctx.input.query,
      page: ctx.input.page
    });

    let templates = (result.response_templates || []).map(mapTemplate);

    return {
      output: { templates },
      message: `Found **${templates.length}** response templates.`
    };
  })
  .build();

export let getResponseTemplate = SlateTool.create(spec, {
  name: 'Get Response Template',
  key: 'get_response_template',
  description:
    'Retrieve a response template by its ID, including its content and group. Call list_response_templates to discover template IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z
        .string()
        .min(1)
        .describe('Template ID. Call list_response_templates to find template IDs.')
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let result = await client.getResponseTemplate(ctx.input.templateId);
    let template = result.response_template || result;

    return {
      output: mapTemplate(template),
      message: `Retrieved response template **${template.name}**.`
    };
  })
  .build();

export let createResponseTemplate = SlateTool.create(spec, {
  name: 'Create Response Template',
  key: 'create_response_template',
  description: `Create a new pre-written response template for staff to use when replying to conversations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      templateBody: z.string().describe('Template body content'),
      isPersonal: z
        .boolean()
        .optional()
        .describe(
          'Create a personal template when true, or a shared template when false. Personal templates require permission.'
        )
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.createResponseTemplate({
      name: ctx.input.name,
      body: ctx.input.templateBody,
      isPersonal: ctx.input.isPersonal
    });

    let t = result.response_template || result;

    return {
      output: mapTemplate(t),
      message: `Created response template **${t.name}**.`
    };
  })
  .build();

export let updateResponseTemplate = SlateTool.create(spec, {
  name: 'Update Response Template',
  key: 'update_response_template',
  description: `Update an existing response template's name, body content, or personal/shared setting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the response template to update'),
      name: z.string().optional().describe('Updated template name'),
      templateBody: z.string().optional().describe('Updated template body content'),
      isPersonal: z
        .boolean()
        .optional()
        .describe(
          'Set true for a personal template or false for a shared template. Personal templates require permission.'
        )
    })
  )
  .output(templateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.updateResponseTemplate(ctx.input.templateId, {
      name: ctx.input.name,
      body: ctx.input.templateBody,
      isPersonal: ctx.input.isPersonal
    });

    let t = result.response_template || result;

    return {
      output: mapTemplate(t),
      message: `Updated response template **${t.name || ctx.input.templateId}**.`
    };
  })
  .build();

let mapTemplate = (template: any) => ({
  templateId: toNumericId(template.id, 'Response template ID'),
  isPersonal:
    template.is_personal == null
      ? undefined
      : template.is_personal === true || template.is_personal === 1,
  name: template.name,
  templateBody: template.body,
  groupName: template.response_template_group?.name,
  groupId:
    template.response_template_group?.id == null
      ? template.response_template_group?.id
      : toNumericId(template.response_template_group.id, 'Response template group ID')
});
