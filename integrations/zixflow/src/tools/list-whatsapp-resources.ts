import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppResources = SlateTool.create(spec, {
  name: 'List WhatsApp Resources',
  key: 'list_whatsapp_resources',
  description: `Retrieve WhatsApp account information, templates, and template variables. Use this to discover available phone IDs, template names, and required variables before sending WhatsApp messages.`,
  instructions: [
    'Use resourceType "accounts" to list connected WhatsApp Business Accounts and their phone IDs.',
    'Use resourceType "templates" to list approved message templates for a specific phone ID.',
    'Use resourceType "template_variables" to get the variables required by a specific template.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['accounts', 'templates', 'template_variables'])
        .describe('Type of resource to retrieve'),
      phoneId: z
        .string()
        .optional()
        .describe('WhatsApp phone ID (required for templates and template_variables)'),
      templateName: z
        .string()
        .optional()
        .describe('Template name (required for template_variables)'),
      limit: z
        .number()
        .optional()
        .describe('Number of templates to return (for templates, default: 10)'),
      offset: z.number().optional().describe('Pagination offset (for templates, default: 0)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was successful'),
      resources: z.array(z.record(z.string(), z.any())).describe('Retrieved resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.resourceType === 'accounts') {
      result = await client.getWhatsAppAccounts();
    } else if (ctx.input.resourceType === 'templates') {
      result = await client.getWhatsAppTemplates(
        ctx.input.phoneId!,
        ctx.input.limit ?? 10,
        ctx.input.offset ?? 0
      );
    } else {
      result = await client.getWhatsAppTemplateVariables(
        ctx.input.phoneId!,
        ctx.input.templateName!
      );
    }

    let resources = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        success: result.status === true,
        resources
      },
      message: `Retrieved ${resources.length} WhatsApp ${ctx.input.resourceType}.`
    };
  })
  .build();
