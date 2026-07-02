import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lists',
  key: 'manage_lists',
  description: `Create, update, or delete subscriber lists. Lists are the primary organizational structure for contacts in Doppler.
Use this tool to create new lists, rename existing ones, or remove lists that are no longer needed.`,
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
      listId: z
        .number()
        .optional()
        .describe(
          'ID of the list to update or delete. Required for update and delete actions.'
        ),
      name: z
        .string()
        .optional()
        .describe(
          'Name for the list. Required for create, optional for update (max 100 characters).'
        )
    })
  )
  .output(
    z.object({
      listId: z.number().optional().describe('ID of the created or updated list'),
      message: z.string().describe('Result message from the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('Name is required when creating a list');
      }
      let result = await client.createList(ctx.input.name);
      return {
        output: {
          listId: result.createdResourceId,
          message: result.message
        },
        message: `Created list **${ctx.input.name}** with ID \`${result.createdResourceId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.listId) {
        throw new Error('listId is required when updating a list');
      }
      if (!ctx.input.name) {
        throw new Error('name is required when updating a list');
      }
      await client.updateList(ctx.input.listId, ctx.input.name);
      return {
        output: {
          listId: ctx.input.listId,
          message: 'List updated successfully'
        },
        message: `Updated list \`${ctx.input.listId}\` name to **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.listId) {
        throw new Error('listId is required when deleting a list');
      }
      await client.deleteList(ctx.input.listId);
      return {
        output: {
          listId: ctx.input.listId,
          message: 'List deleted successfully'
        },
        message: `Deleted list \`${ctx.input.listId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
