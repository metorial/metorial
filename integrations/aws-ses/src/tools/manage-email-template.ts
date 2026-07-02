import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailTemplate = SlateTool.create(spec, {
  name: 'Manage Email Template',
  key: 'manage_email_template',
  description: `Create, update, retrieve, delete, or list SES email templates. Templates support placeholder variables for personalization and can be used with both single and bulk email sending.

Use the **testRender** action to preview how a template renders with sample data.`,
  instructions: [
    'For "create" and "update", subject is required. Provide html and/or text for the template body.',
    'For "testRender", pass templateData as a JSON string with values for all template variables.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list', 'testRender'])
        .describe('Operation to perform'),
      templateName: z
        .string()
        .optional()
        .describe('Template name (required for all actions except "list")'),
      subject: z.string().optional().describe('Email subject line for the template'),
      html: z.string().optional().describe('HTML body of the template'),
      text: z.string().optional().describe('Plain text body of the template'),
      templateData: z
        .string()
        .optional()
        .describe('JSON string of sample data for test rendering'),
      nextToken: z.string().optional().describe('Pagination token for "list" action'),
      pageSize: z.number().optional().describe('Number of results per page for "list" action')
    })
  )
  .output(
    z.object({
      templateName: z.string().optional().describe('Template name'),
      subject: z.string().optional().describe('Template subject'),
      html: z.string().optional().describe('Template HTML body'),
      text: z.string().optional().describe('Template text body'),
      renderedTemplate: z
        .string()
        .optional()
        .describe('Rendered template output from testRender'),
      templates: z
        .array(
          z.object({
            templateName: z.string(),
            createdTimestamp: z.string()
          })
        )
        .optional()
        .describe('List of templates'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      await client.createEmailTemplate({
        templateName: ctx.input.templateName!,
        subject: ctx.input.subject!,
        html: ctx.input.html,
        text: ctx.input.text
      });
      return {
        output: { templateName: ctx.input.templateName },
        message: `Template **${ctx.input.templateName}** created successfully.`
      };
    }

    if (action === 'get') {
      let template = await client.getEmailTemplate(ctx.input.templateName!);
      return {
        output: template,
        message: `Retrieved template **${template.templateName}**.`
      };
    }

    if (action === 'update') {
      await client.updateEmailTemplate({
        templateName: ctx.input.templateName!,
        subject: ctx.input.subject!,
        html: ctx.input.html,
        text: ctx.input.text
      });
      return {
        output: { templateName: ctx.input.templateName },
        message: `Template **${ctx.input.templateName}** updated successfully.`
      };
    }

    if (action === 'delete') {
      await client.deleteEmailTemplate(ctx.input.templateName!);
      return {
        output: { templateName: ctx.input.templateName },
        message: `Template **${ctx.input.templateName}** deleted.`
      };
    }

    if (action === 'list') {
      let result = await client.listEmailTemplates({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          templates: result.templates,
          nextToken: result.nextToken
        },
        message: `Found **${result.templates.length}** template(s).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    if (action === 'testRender') {
      let result = await client.testRenderEmailTemplate(
        ctx.input.templateName!,
        ctx.input.templateData || '{}'
      );
      return {
        output: {
          templateName: ctx.input.templateName,
          renderedTemplate: result.renderedTemplate
        },
        message: `Template **${ctx.input.templateName}** rendered successfully.`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
