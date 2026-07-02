import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageConversation = SlateTool.create(spec, {
  name: 'Manage Conversation',
  key: 'manage_conversation',
  description: `Manage a WhatsApp conversation by assigning it to an operator or updating its status.
Use "assign_operator" to route a conversation to a specific team member, or "update_status" to change the conversation state (e.g., open, resolved).`,
  instructions: [
    'For "assign_operator": provide the operator\'s email address.',
    'For "update_status": provide the new status string (e.g., "open", "resolved").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['assign_operator', 'update_status'])
        .describe('The conversation management action to perform.'),
      target: z
        .string()
        .describe(
          'Conversation identifier: phone number with country code, conversation ID, or Channel:PhoneNumber.'
        ),
      operatorEmail: z
        .string()
        .optional()
        .describe('Email address of the operator to assign. Required for "assign_operator".'),
      status: z
        .string()
        .optional()
        .describe(
          'New conversation status (e.g. "open", "resolved"). Required for "update_status".'
        )
    })
  )
  .output(
    z.object({
      result: z.boolean().optional().describe('Whether the operation succeeded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action, target, operatorEmail, status } = ctx.input;

    if (action === 'assign_operator') {
      if (!operatorEmail) {
        throw new Error('operatorEmail is required for assigning an operator.');
      }
      let result = await client.assignOperator(target, operatorEmail);
      return {
        output: { result: result?.result ?? true },
        message: `Conversation **${target}** assigned to operator **${operatorEmail}**.`
      };
    }

    if (action === 'update_status') {
      if (!status) {
        throw new Error('status is required for updating conversation status.');
      }
      let result = await client.updateConversationStatus(target, status);
      return {
        output: { result: result?.result ?? true },
        message: `Conversation **${target}** status updated to **${status}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
