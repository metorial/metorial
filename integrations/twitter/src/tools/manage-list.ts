import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { listSchema, mapList, mapPost, mapUser, postSchema, userSchema } from '../lib/helpers';
import { spec } from '../spec';

export let manageList = SlateTool.create(spec, {
  name: 'Manage List',
  key: 'manage_list',
  description: `Create, update, delete Twitter/X lists, manage list members, or retrieve list details, members, and posts. A single tool for all list operations.`,
  instructions: [
    '**create**: Create a new list with a name and optional description/privacy setting.',
    "**update**: Update a list's name, description, or privacy.",
    '**delete**: Delete a list by ID.',
    '**get**: Get list details by ID.',
    '**list_owned**: Get lists owned by a user.',
    '**add_member** / **remove_member**: Add or remove a user from a list.',
    '**list_members**: Get members of a list.',
    '**list_posts**: Get recent posts from list members.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'get',
          'list_owned',
          'add_member',
          'remove_member',
          'list_members',
          'list_posts'
        ])
        .describe('Action to perform'),
      listId: z
        .string()
        .optional()
        .describe(
          'List ID (required for update, delete, get, add/remove member, list members/posts)'
        ),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for list_owned, add/remove member)'),
      name: z
        .string()
        .optional()
        .describe('List name (required for create, optional for update)'),
      description: z.string().optional().describe('List description'),
      isPrivate: z.boolean().optional().describe('Whether the list is private'),
      maxResults: z.number().optional().describe('Number of results for list actions'),
      paginationToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      list: listSchema.optional().describe('List details'),
      lists: z.array(listSchema).optional().describe('Multiple lists'),
      users: z.array(userSchema).optional().describe('List members'),
      posts: z.array(postSchema).optional().describe('Posts from list'),
      success: z.boolean().optional().describe('Whether the action was successful'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let { action, listId, userId, name, description, isPrivate, maxResults, paginationToken } =
      ctx.input;

    if (action === 'create') {
      if (!name) throw twitterServiceError('name is required to create a list.');
      let result = await client.createList(name, description, isPrivate);
      let list = mapList(result.data);
      return {
        output: { list, success: true },
        message: `Created list **${name}**.`
      };
    }

    if (action === 'update') {
      if (!listId) throw twitterServiceError('listId is required to update a list.');
      await client.updateList(listId, { name, description, isPrivate });
      return {
        output: { success: true },
        message: `Updated list ${listId}.`
      };
    }

    if (action === 'delete') {
      if (!listId) throw twitterServiceError('listId is required to delete a list.');
      await client.deleteList(listId);
      return {
        output: { success: true },
        message: `Deleted list ${listId}.`
      };
    }

    if (action === 'get') {
      if (!listId) throw twitterServiceError('listId is required to get a list.');
      let result = await client.getList(listId);
      let list = mapList(result.data);
      return {
        output: { list },
        message: `Retrieved list **${list.name}**.`
      };
    }

    if (action === 'list_owned') {
      if (!userId) throw twitterServiceError('userId is required to list owned lists.');
      let result = await client.getUserOwnedLists(userId, { maxResults, paginationToken });
      let lists = (result.data || []).map(mapList);
      return {
        output: { lists, nextToken: result.meta?.next_token },
        message: `Retrieved **${lists.length}** owned list(s).`
      };
    }

    if (action === 'add_member') {
      if (!listId || !userId)
        throw twitterServiceError('listId and userId are required to add a member.');
      await client.addListMember(listId, userId);
      return {
        output: { success: true },
        message: `Added user ${userId} to list ${listId}.`
      };
    }

    if (action === 'remove_member') {
      if (!listId || !userId)
        throw twitterServiceError('listId and userId are required to remove a member.');
      await client.removeListMember(listId, userId);
      return {
        output: { success: true },
        message: `Removed user ${userId} from list ${listId}.`
      };
    }

    if (action === 'list_members') {
      if (!listId) throw twitterServiceError('listId is required to list members.');
      let result = await client.getListMembers(listId, { maxResults, paginationToken });
      let users = (result.data || []).map(mapUser);
      return {
        output: { users, nextToken: result.meta?.next_token },
        message: `Retrieved **${users.length}** list member(s).`
      };
    }

    if (action === 'list_posts') {
      if (!listId) throw twitterServiceError('listId is required to list posts.');
      let result = await client.getListPosts(listId, { maxResults, paginationToken });
      let posts = (result.data || []).map(mapPost);
      return {
        output: { posts, nextToken: result.meta?.next_token },
        message: `Retrieved **${posts.length}** post(s) from the list.`
      };
    }

    throw twitterServiceError('Invalid action.');
  })
  .build();
