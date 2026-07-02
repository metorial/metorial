import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireArrayField, requireField, requireUserIdentity } from '../lib/validation';
import { spec } from '../spec';

let parseListUsers = (result: unknown) => {
  if (typeof result === 'string') {
    return result
      .split(/\r?\n|,/)
      .map(user => user.trim())
      .filter(Boolean);
  }

  let value = result as any;
  let users = value?.users || value?.params?.users || value?.emails || [];
  if (!Array.isArray(users)) {
    return [];
  }

  return users.map(user => String(user)).filter(Boolean);
};

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
        .enum(['list', 'create', 'delete', 'getUsers', 'subscribe', 'unsubscribe'])
        .describe(
          'Operation to perform: list all lists, create a new list, delete a list, get users in a list, subscribe users to a list, or unsubscribe users from a list'
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
      users: z.array(z.string()).optional().describe('Users returned by getUsers'),
      userCount: z.number().optional().describe('Number of users returned by getUsers'),
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
      let listName = requireField(ctx.input.listName, 'listName');
      let result = await client.createList(listName);
      return {
        output: {
          listId: result.listId,
          message: `List "${listName}" created.`
        },
        message: `Created list **${listName}** with ID **${result.listId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let listId = requireField(ctx.input.listId, 'listId');
      await client.deleteList(listId);
      return {
        output: {
          message: `List ${listId} deleted.`
        },
        message: `Deleted list **${listId}**.`
      };
    }

    if (ctx.input.action === 'getUsers') {
      let listId = requireField(ctx.input.listId, 'listId');
      let users = parseListUsers(await client.getListUsers(listId));
      return {
        output: {
          users,
          userCount: users.length,
          message: `Found ${users.length} user(s) in list ${listId}.`
        },
        message: `Retrieved **${users.length}** user(s) from list **${listId}**.`
      };
    }

    if (ctx.input.action === 'subscribe') {
      let listId = requireField(ctx.input.listId, 'listId');
      let subscribers = requireArrayField(ctx.input.subscribers, 'subscribers');
      for (let subscriber of subscribers) {
        requireUserIdentity(subscriber, 'subscriber');
      }

      let subs = subscribers.map(s => ({
        email: s.email,
        userId: s.userId,
        dataFields: s.subscriberFields
      }));
      let result = await client.subscribeToList(listId, subs);
      return {
        output: {
          successCount: result.successCount,
          failCount: result.failCount,
          message: `Subscribed ${result.successCount || subs.length} user(s) to list ${listId}.`
        },
        message: `Subscribed **${result.successCount || subs.length}** user(s) to list **${listId}**.`
      };
    }

    // unsubscribe
    let listId = requireField(ctx.input.listId, 'listId');
    let subscribers = requireArrayField(ctx.input.subscribers, 'subscribers');
    for (let subscriber of subscribers) {
      requireUserIdentity(subscriber, 'subscriber');
    }

    let subs = subscribers.map(s => ({
      email: s.email,
      userId: s.userId
    }));
    let result = await client.unsubscribeFromList(listId, subs);
    return {
      output: {
        successCount: result.successCount,
        failCount: result.failCount,
        message: `Unsubscribed ${result.successCount || subs.length} user(s) from list ${listId}.`
      },
      message: `Unsubscribed **${result.successCount || subs.length}** user(s) from list **${listId}**.`
    };
  })
  .build();
