import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lists',
  key: 'manage_lists',
  description: `Create, delete, or retrieve lists in Iterable. Lists are used to organize users into segments for campaign targeting and journey entry. Also supports subscribing and unsubscribing users to/from lists.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'subscribe', 'unsubscribe'])
        .describe(
          'Operation to perform: list all lists, create a new list, delete a list, subscribe users to a list, or unsubscribe users from a list'
        ),
      listName: z.string().optional().describe('Name for a new list (required for create)'),
      listId: z
        .number()
        .optional()
        .describe('ID of the list (required for delete, subscribe, unsubscribe)'),
      subscribers: z
        .array(
          z.object({
            email: z.string().optional().describe('User email'),
            userId: z.string().optional().describe('User ID'),
            subscriberFields: z
              .record(z.string(), z.any())
              .optional()
              .describe('Custom data fields to set on the user during subscription')
          })
        )
        .optional()
        .describe('List of users to subscribe/unsubscribe')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('List ID'),
            name: z.string().describe('List name'),
            createdAt: z.string().optional().describe('When the list was created'),
            listType: z.string().optional().describe('Type of list')
          })
        )
        .optional()
        .describe('All lists (for list action)'),
      listId: z.number().optional().describe('ID of newly created list'),
      successCount: z
        .number()
        .optional()
        .describe('Number of successful subscribe/unsubscribe operations'),
      failCount: z
        .number()
        .optional()
        .describe('Number of failed subscribe/unsubscribe operations'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'list') {
      let result = await client.getLists();
      let lists = (result.lists || []).map((l: any) => ({
        listId: l.id,
        name: l.name,
        createdAt: l.createdAt ? String(l.createdAt) : undefined,
        listType: l.listType
      }));
      return {
        output: {
          lists,
          message: `Found ${lists.length} list(s).`
        },
        message: `Retrieved **${lists.length}** list(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createList(ctx.input.listName!);
      return {
        output: {
          listId: result.listId,
          message: `List "${ctx.input.listName}" created.`
        },
        message: `Created list **${ctx.input.listName}** with ID **${result.listId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteList(ctx.input.listId!);
      return {
        output: {
          message: `List ${ctx.input.listId} deleted.`
        },
        message: `Deleted list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'subscribe') {
      let subs = (ctx.input.subscribers || []).map(s => ({
        email: s.email,
        userId: s.userId,
        dataFields: s.subscriberFields
      }));
      let result = await client.subscribeToList(ctx.input.listId!, subs);
      return {
        output: {
          successCount: result.successCount,
          failCount: result.failCount,
          message: `Subscribed ${result.successCount || subs.length} user(s) to list ${ctx.input.listId}.`
        },
        message: `Subscribed **${result.successCount || subs.length}** user(s) to list **${ctx.input.listId}**.`
      };
    }

    // unsubscribe
    let subs = (ctx.input.subscribers || []).map(s => ({
      email: s.email,
      userId: s.userId
    }));
    let result = await client.unsubscribeFromList(ctx.input.listId!, subs);
    return {
      output: {
        successCount: result.successCount,
        failCount: result.failCount,
        message: `Unsubscribed ${result.successCount || subs.length} user(s) from list ${ctx.input.listId}.`
      },
      message: `Unsubscribed **${result.successCount || subs.length}** user(s) from list **${ctx.input.listId}**.`
    };
  })
  .build();
