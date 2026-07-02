import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignConversation = SlateTool.create(spec, {
  name: 'Assign Conversation',
  key: 'assign_conversation',
  description: `Assign or unassign a user (agent) to a contact's conversation. To unassign, omit the assigneeId. Use the List Workspace Users tool to find available user IDs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact whose conversation to assign'),
      assigneeId: z
        .number()
        .optional()
        .describe('User ID of the agent to assign. Omit to unassign the current agent.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      assigned: z.boolean().describe('Whether the contact is now assigned'),
      assigneeId: z.number().optional().describe('ID of the assigned user, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.assigneeId !== undefined) {
      await client.assignConversation(ctx.input.contactId, ctx.input.assigneeId);
    } else {
      await client.unassignConversation(ctx.input.contactId);
    }

    return {
      output: {
        contactId: ctx.input.contactId,
        assigned: ctx.input.assigneeId !== undefined,
        assigneeId: ctx.input.assigneeId
      },
      message:
        ctx.input.assigneeId !== undefined
          ? `Assigned user **${ctx.input.assigneeId}** to contact **${ctx.input.contactId}**.`
          : `Unassigned contact **${ctx.input.contactId}**.`
    };
  })
  .build();
