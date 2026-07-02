import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  templateId: z.number().describe('Response template ID'),
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
      page: z.number().optional().describe('Page number for pagination')
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

    let templates = (result.response_templates || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      templateBody: t.body,
      groupName: t.response_template_group?.name,
      groupId: t.response_template_group?.id
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** response templates.`
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
      templateBody: z.string().describe('Template body content')
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
      body: ctx.input.templateBody
    });

    let t = result.response_template || result;

    return {
      output: {
        templateId: t.id,
        name: t.name,
        templateBody: t.body,
        groupName: t.response_template_group?.name,
        groupId: t.response_template_group?.id
      },
      message: `Created response template **${t.name}**.`
    };
  })
  .build();

export let updateResponseTemplate = SlateTool.create(spec, {
  name: 'Update Response Template',
  key: 'update_response_template',
  description: `Update an existing response template's name or body content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('The ID of the response template to update'),
      name: z.string().optional().describe('Updated template name'),
      templateBody: z.string().optional().describe('Updated template body content')
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
      body: ctx.input.templateBody
    });

    let t = result.response_template || result;

    return {
      output: {
        templateId: t.id,
        name: t.name,
        templateBody: t.body,
        groupName: t.response_template_group?.name,
        groupId: t.response_template_group?.id
      },
      message: `Updated response template **${t.name || ctx.input.templateId}**.`
    };
  })
  .build();
