import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageList = SlateTool.create(spec, {
  name: 'Manage List',
  key: 'manage_list',
  description: `Creates, updates, retrieves, or archives a subscription list in Engage. Lists group customers for targeted messaging and campaigns. Supports double opt-in and redirect URLs for post-subscription behavior.`,
  instructions: [
    'Use action "create" to create a new list.',
    'Use action "update" to update an existing list by its ID.',
    'Use action "get" to retrieve a list by its ID.',
    'Use action "archive" to archive a list (prevents new subscriptions).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'archive']).describe('Operation to perform'),
      listId: z.string().optional().describe('List ID (required for update, get, archive)'),
      title: z
        .string()
        .optional()
        .describe('List title (max 64 characters, required for create)'),
      description: z
        .string()
        .optional()
        .describe('List description (max 255 characters, visible to subscribers)'),
      redirectUrl: z.string().optional().describe('URL to redirect to after subscription'),
      doubleOptin: z.boolean().optional().describe('Enable double opt-in confirmation emails')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('List ID'),
      title: z.string().optional().describe('List title'),
      description: z.string().nullable().optional().describe('List description'),
      subscriberCount: z.number().optional().describe('Number of subscribers'),
      broadcastCount: z.number().optional().describe('Number of broadcasts sent'),
      doubleOptin: z.boolean().optional().describe('Whether double opt-in is enabled'),
      redirectUrl: z.string().nullable().optional().describe('Post-subscription redirect URL'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      status: z.string().optional().describe('Operation status (for archive)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let { action, listId, title, description, redirectUrl, doubleOptin } = ctx.input;

    if (action === 'create') {
      if (!title) throw new Error('Title is required when creating a list');
      let list = await client.createList({ title, description, redirectUrl, doubleOptin });
      return {
        output: {
          listId: list.id,
          title: list.title,
          description: list.description,
          subscriberCount: list.subscriber_count,
          broadcastCount: list.broadcast_count,
          doubleOptin: list.double_optin,
          redirectUrl: list.redirect_url,
          createdAt: list.created_at
        },
        message: `Created list **"${list.title}"** (ID: ${list.id}).`
      };
    }

    if (!listId) throw new Error('List ID is required for update, get, and archive actions');

    if (action === 'get') {
      let list = await client.getList(listId);
      return {
        output: {
          listId: list.id,
          title: list.title,
          description: list.description,
          subscriberCount: list.subscriber_count,
          broadcastCount: list.broadcast_count,
          doubleOptin: list.double_optin,
          redirectUrl: list.redirect_url,
          createdAt: list.created_at
        },
        message: `Retrieved list **"${list.title}"** with ${list.subscriber_count} subscriber(s).`
      };
    }

    if (action === 'update') {
      let list = await client.updateList(listId, {
        title,
        description,
        redirectUrl,
        doubleOptin
      });
      return {
        output: {
          listId: list.id,
          title: list.title,
          description: list.description,
          subscriberCount: list.subscriber_count,
          broadcastCount: list.broadcast_count,
          doubleOptin: list.double_optin,
          redirectUrl: list.redirect_url,
          createdAt: list.created_at
        },
        message: `Updated list **"${list.title}"**.`
      };
    }

    // archive
    let result = await client.archiveList(listId);
    return {
      output: {
        listId,
        status: result.status
      },
      message: `Archived list **${listId}**.`
    };
  })
  .build();
