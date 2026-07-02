import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Subscriber Lists',
  key: 'manage_lists',
  description: `Create, update, or delete subscriber lists in Sendloop. Use this to organize your email subscribers into separate lists based on audience, source, or campaign purpose.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('The operation to perform on the subscriber list'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the subscriber list (required for create)'),
      optInMode: z
        .enum(['single', 'double'])
        .optional()
        .describe('Opt-in mode: single (immediate) or double (confirmation email)'),
      notifyOnSubscribe: z
        .boolean()
        .optional()
        .describe('Whether to send notification when someone subscribes'),
      notifyOnUnsubscribe: z
        .boolean()
        .optional()
        .describe('Whether to send notification when someone unsubscribes'),
      notifyEmail: z
        .string()
        .optional()
        .describe('Email address to receive subscription notifications')
    })
  )
  .output(
    z.object({
      listId: z.string().optional().describe('ID of the created, updated, or deleted list'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let {
      action,
      listId,
      name,
      optInMode,
      notifyOnSubscribe,
      notifyOnUnsubscribe,
      notifyEmail
    } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('List name is required for create action');
      let result = await client.createList({
        name,
        optInMode: optInMode || undefined,
        notifyOnSubscribe:
          notifyOnSubscribe !== undefined ? (notifyOnSubscribe ? '1' : '0') : undefined,
        notifyOnUnsubscribe:
          notifyOnUnsubscribe !== undefined ? (notifyOnUnsubscribe ? '1' : '0') : undefined,
        notifyEmail
      });

      return {
        output: {
          listId: String(result.ListID || result.ListId || ''),
          success: true
        },
        message: `Successfully created subscriber list **${name}**.`
      };
    }

    if (action === 'update') {
      if (!listId) throw new Error('List ID is required for update action');
      await client.updateList(listId, {
        name,
        optInMode: optInMode || undefined,
        notifyOnSubscribe:
          notifyOnSubscribe !== undefined ? (notifyOnSubscribe ? '1' : '0') : undefined,
        notifyOnUnsubscribe:
          notifyOnUnsubscribe !== undefined ? (notifyOnUnsubscribe ? '1' : '0') : undefined,
        notifyEmail
      });

      return {
        output: {
          listId,
          success: true
        },
        message: `Successfully updated subscriber list **${listId}**.`
      };
    }

    if (action === 'delete') {
      if (!listId) throw new Error('List ID is required for delete action');
      await client.deleteList(listId);

      return {
        output: {
          listId,
          success: true
        },
        message: `Successfully deleted subscriber list **${listId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
