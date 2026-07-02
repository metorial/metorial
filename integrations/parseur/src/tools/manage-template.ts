import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Perform actions on a template: retrieve its full details, copy it to another mailbox, or delete it. Templates define how documents are parsed in a mailbox.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template'),
      action: z.enum(['get', 'copy', 'delete']).describe('Action to perform'),
      targetMailboxId: z
        .number()
        .optional()
        .describe('Target mailbox ID (required for copy action)')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Template ID'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded'),
      template: z
        .object({
          templateId: z.number(),
          name: z.string(),
          engine: z.string(),
          status: z.string(),
          documentCount: z.number(),
          mailboxId: z.number()
        })
        .nullable()
        .describe('Template details (for get action)'),
      resultMessage: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { templateId, action, targetMailboxId } = ctx.input;

    let templateOutput: {
      templateId: number;
      name: string;
      engine: string;
      status: string;
      documentCount: number;
      mailboxId: number;
    } | null = null;
    let resultMessage = '';

    switch (action) {
      case 'get': {
        let t = await client.getTemplate(templateId);
        templateOutput = {
          templateId: t.id,
          name: t.name,
          engine: t.engine,
          status: t.status,
          documentCount: t.document_count,
          mailboxId: t.parser
        };
        resultMessage = `Retrieved template "${t.name}"`;
        break;
      }
      case 'copy': {
        if (!targetMailboxId) {
          throw new Error('targetMailboxId is required for copy action');
        }
        let result = await client.copyTemplate(templateId, targetMailboxId);
        resultMessage = result.message || `Template copied to mailbox ${targetMailboxId}`;
        break;
      }
      case 'delete': {
        await client.deleteTemplate(templateId);
        resultMessage = 'Template deleted';
        break;
      }
    }

    return {
      output: {
        templateId,
        action,
        success: true,
        template: templateOutput,
        resultMessage
      },
      message: `**${action}** on template ${templateId}: ${resultMessage}`
    };
  })
  .build();
