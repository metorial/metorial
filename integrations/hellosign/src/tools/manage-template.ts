import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Manage a signature request template: update its properties (title, subject, message), delete it, or manage user access by adding or removing users who can use the template.`,
  instructions: [
    'Use action "update" to change template title, subject, or message.',
    'Use action "delete" to permanently delete a template.',
    'Use action "add_user" or "remove_user" to manage who has access to the template.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template'),
      action: z
        .enum(['update', 'delete', 'add_user', 'remove_user'])
        .describe('Action to perform'),
      title: z.string().optional().describe('New template title (for "update" action)'),
      subject: z.string().optional().describe('New default subject (for "update" action)'),
      message: z.string().optional().describe('New default message (for "update" action)'),
      userEmailAddress: z
        .string()
        .optional()
        .describe('Email of user to add/remove (for "add_user"/"remove_user")'),
      userAccountId: z
        .string()
        .optional()
        .describe('Account ID of user to add/remove (alternative to email)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      templateId: z.string().describe('ID of the affected template'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { templateId, action } = ctx.input;

    switch (action) {
      case 'update':
        await client.updateTemplate(templateId, {
          title: ctx.input.title,
          subject: ctx.input.subject,
          message: ctx.input.message
        });
        break;

      case 'delete':
        await client.deleteTemplate(templateId);
        break;

      case 'add_user':
        await client.addTemplateUser(templateId, {
          accountId: ctx.input.userAccountId,
          emailAddress: ctx.input.userEmailAddress
        });
        break;

      case 'remove_user':
        await client.removeTemplateUser(templateId, {
          accountId: ctx.input.userAccountId,
          emailAddress: ctx.input.userEmailAddress
        });
        break;
    }

    let actionLabels: Record<string, string> = {
      update: 'updated',
      delete: 'deleted',
      add_user: 'user added',
      remove_user: 'user removed'
    };

    return {
      output: {
        success: true,
        templateId,
        action
      },
      message: `Template **${templateId}** — ${actionLabels[action]}.`
    };
  })
  .build();
