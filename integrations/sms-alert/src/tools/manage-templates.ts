import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient, type SmsAlertResponse } from '../lib/client';
import { limitSchema, orderSchema, pageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageTemplates = SlateTool.create(spec, {
  name: 'Manage Templates',
  key: 'manage_templates',
  description: `List, create, edit, or delete reusable SMS templates. Templates store pre-defined message content for use in SMS campaigns.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'edit', 'delete'])
        .describe('Action to perform on templates.'),
      page: pageSchema,
      limit: limitSchema,
      order: orderSchema,
      templateId: z
        .string()
        .optional()
        .describe('Template ID (required for edit and delete).'),
      templateName: z
        .string()
        .optional()
        .describe('Template name (required for create, optional for edit).'),
      templateBody: z
        .string()
        .optional()
        .describe('Template message content (required for create, optional for edit).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z
        .any()
        .describe('Response details including template data or confirmation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient(ctx.auth);

    let result: SmsAlertResponse;

    if (ctx.input.action === 'list') {
      ctx.info('Listing templates');
      result = await client.listTemplates(ctx.input);
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Retrieved SMS templates`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.templateName) throw createApiServiceError('Template name is required.');
      if (!ctx.input.templateBody) throw createApiServiceError('Template body is required.');

      ctx.info(`Creating template: ${ctx.input.templateName}`);
      result = await client.createTemplate({
        templateName: ctx.input.templateName,
        templateBody: ctx.input.templateBody
      });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Template **${ctx.input.templateName}** created`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.templateId)
        throw createApiServiceError('Template ID is required to edit.');

      if (!ctx.input.templateName && !ctx.input.templateBody)
        throw createApiServiceError('Provide templateName or templateBody to update.');

      ctx.info(`Editing template: ${ctx.input.templateId}`);
      result = await client.editTemplate({
        templateId: ctx.input.templateId,
        templateName: ctx.input.templateName,
        templateBody: ctx.input.templateBody
      });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Template **${ctx.input.templateId}** updated`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.templateId)
        throw createApiServiceError('Template ID is required to delete.');

      ctx.info(`Deleting template: ${ctx.input.templateId}`);
      result = await client.deleteTemplate({ templateId: ctx.input.templateId });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description ?? result
        },
        message: `Template **${ctx.input.templateId}** deleted`
      };
    }

    throw createApiServiceError(`Invalid action: ${ctx.input.action}`);
  })
  .build();
