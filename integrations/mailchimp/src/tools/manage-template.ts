import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTemplateTool = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Create, update, or delete an email template. To create, provide a name and HTML content. To update, provide templateId and the fields to change. To delete, provide templateId and set delete to true.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z
        .number()
        .optional()
        .describe('Template ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the template'),
      name: z.string().optional().describe('Template name'),
      html: z.string().optional().describe('HTML content of the template'),
      folderId: z.string().optional().describe('Folder ID to organize the template')
    })
  )
  .output(
    z.object({
      templateId: z.number().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    if (ctx.input.delete && ctx.input.templateId) {
      await client.deleteTemplate(ctx.input.templateId);
      return {
        output: { templateId: ctx.input.templateId, deleted: true },
        message: `Template **${ctx.input.templateId}** has been deleted.`
      };
    }

    if (ctx.input.templateId) {
      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.html) updateData.html = ctx.input.html;
      if (ctx.input.folderId) updateData.folder_id = ctx.input.folderId;

      if (Object.keys(updateData).length === 0) {
        throw mailchimpServiceError(
          'At least one field must be provided to update a template.'
        );
      }

      let result = await client.updateTemplate(ctx.input.templateId, updateData);
      return {
        output: { templateId: result.id, name: result.name },
        message: `Template **${result.name}** has been updated.`
      };
    }

    if (!ctx.input.name || !ctx.input.html) {
      throw mailchimpServiceError('name and html are required to create a template.');
    }

    let result = await client.createTemplate({
      name: ctx.input.name,
      html: ctx.input.html,
      folderId: ctx.input.folderId
    });

    return {
      output: { templateId: result.id, name: result.name },
      message: `Template **${result.name}** (${result.id}) has been created.`
    };
  })
  .build();
