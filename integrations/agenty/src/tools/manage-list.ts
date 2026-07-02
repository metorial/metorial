import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageList = SlateTool.create(spec, {
  name: 'Manage List',
  key: 'manage_list',
  description: `Create, retrieve, update, or delete reusable URL/data lists that can be attached to agents as input sources. Lists are useful for managing large sets of URLs across multiple agents. You can also add rows to existing lists.`,
  instructions: [
    'Use action "list" to see all lists, "get" to retrieve a specific list, "create" to make a new one, "update" to modify, "delete" to remove, or "add_rows" to add data rows.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'add_rows'])
        .describe('The list action to perform.'),
      listId: z
        .string()
        .optional()
        .describe('List ID. Required for get, update, delete, and add_rows.'),
      name: z
        .string()
        .optional()
        .describe('List name. Required for create, optional for update.'),
      description: z
        .string()
        .optional()
        .describe('List description. Used with create or update.'),
      columns: z
        .array(
          z.object({
            name: z.string().describe('Column name.'),
            type: z.string().optional().describe('Column type.')
          })
        )
        .optional()
        .describe('Column definitions. Used with create.'),
      rows: z
        .array(z.record(z.string(), z.string()))
        .optional()
        .describe(
          'Data rows to add. Used with add_rows. Each row is an object with column names as keys.'
        ),
      offset: z.number().optional().describe('Pagination offset for list action.'),
      limit: z.number().optional().describe('Pagination limit for list action.')
    })
  )
  .output(
    z.object({
      statusCode: z.number().optional().describe('HTTP status code.'),
      message: z.string().optional().describe('Status message.'),
      lists: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .nullable()
        .describe('Array of lists when using "list" action.'),
      listDetails: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('List details when using "get" or "create" action.'),
      total: z.number().optional().nullable().describe('Total number of lists.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listLists({
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
      let lists = result.result || [];
      return {
        output: {
          lists,
          total: result.total
        },
        message: `Found **${result.total ?? lists.length}** lists.`
      };
    }

    if (ctx.input.action === 'get') {
      let result = await client.getList(ctx.input.listId!);
      return {
        output: {
          listDetails: result
        },
        message: `Retrieved list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createList({
        name: ctx.input.name!,
        description: ctx.input.description,
        columns: ctx.input.columns
      });
      return {
        output: {
          listDetails: result,
          message: 'List created successfully.'
        },
        message: `Created list **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateList(ctx.input.listId!, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          statusCode: result.status_code || 200,
          message: result.message || 'List updated successfully.'
        },
        message: `Updated list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteList(ctx.input.listId!);
      return {
        output: {
          statusCode: result.status_code || 200,
          message: result.message || 'List deleted successfully.'
        },
        message: `Deleted list **${ctx.input.listId}**.`
      };
    }

    // add_rows
    let result = await client.addListRows(ctx.input.listId!, ctx.input.rows || []);
    return {
      output: {
        statusCode: result.status_code || 200,
        message: result.message || 'Rows added successfully.'
      },
      message: `Added **${(ctx.input.rows || []).length}** rows to list **${ctx.input.listId}**.`
    };
  })
  .build();
