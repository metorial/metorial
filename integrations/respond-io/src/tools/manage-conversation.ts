import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Open or close a conversation for a contact. When closing, you can optionally provide a category and summary for the closing note.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact whose conversation to manage'),
      action: z.enum(['open', 'close']).describe('Whether to open or close the conversation'),
      closingCategory: z
        .string()
        .optional()
        .describe('Category for the closing note (when closing)'),
      closingSummary: z
        .string()
        .optional()
        .describe('Summary for the closing note (when closing)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      status: z.string().describe('New conversation status (open or closed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'open') {
      await client.openConversation(ctx.input.contactId);
    } else {
      await client.closeConversation(
        ctx.input.contactId,
        ctx.input.closingCategory,
        ctx.input.closingSummary
      );
    }

    return {
      output: {
        contactId: ctx.input.contactId,
        status: ctx.input.action === 'open' ? 'open' : 'closed'
      },
      message: `**${ctx.input.action === 'open' ? 'Opened' : 'Closed'}** conversation for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
