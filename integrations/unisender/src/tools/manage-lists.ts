import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Contact Lists',
  key: 'manage_lists',
  description: `Create, update, or delete subscription/contact lists. Lists are used to organize contacts for targeted email and SMS campaigns.
Use **action** to specify whether to create, update, or delete a list.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('The operation to perform on the list'),
      listId: z.number().optional().describe('List ID (required for update and delete)'),
      title: z
        .string()
        .optional()
        .describe('Title of the list (required for create and update)'),
      beforeSubscribeUrl: z
        .string()
        .optional()
        .describe('URL for redirect before subscription confirmation'),
      afterSubscribeUrl: z
        .string()
        .optional()
        .describe('URL for redirect after subscription confirmation')
    })
  )
  .output(
    z.object({
      listId: z.number().optional().describe('ID of the created or updated list'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.title) throw new Error('Title is required when creating a list');
      let result = await client.createList({
        title: ctx.input.title,
        before_subscribe_url: ctx.input.beforeSubscribeUrl,
        after_subscribe_url: ctx.input.afterSubscribeUrl
      });
      return {
        output: { listId: result.id, success: true },
        message: `Created list **"${ctx.input.title}"** with ID \`${result.id}\``
      };
    }

    if (action === 'update') {
      if (!ctx.input.listId) throw new Error('listId is required when updating a list');
      if (!ctx.input.title) throw new Error('Title is required when updating a list');
      await client.updateList({
        list_id: ctx.input.listId,
        title: ctx.input.title,
        before_subscribe_url: ctx.input.beforeSubscribeUrl,
        after_subscribe_url: ctx.input.afterSubscribeUrl
      });
      return {
        output: { listId: ctx.input.listId, success: true },
        message: `Updated list \`${ctx.input.listId}\` to **"${ctx.input.title}"**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.listId) throw new Error('listId is required when deleting a list');
      await client.deleteList(ctx.input.listId);
      return {
        output: { listId: ctx.input.listId, success: true },
        message: `Deleted list \`${ctx.input.listId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
