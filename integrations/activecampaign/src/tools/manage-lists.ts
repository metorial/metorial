import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lists',
  key: 'manage_lists',
  description: `Creates, updates, deletes, or retrieves mailing lists. Lists are used for organizing contacts and sending campaigns. To subscribe/unsubscribe contacts from lists, use the Manage List Subscription tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get', 'list'])
        .describe('Action to perform'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the list (required for create)'),
      stringId: z
        .string()
        .optional()
        .describe('URL-safe unique identifier for the list (required for create)'),
      senderUrl: z
        .string()
        .optional()
        .describe('URL of the sender for CAN-SPAM compliance (required for create)'),
      senderReminder: z
        .string()
        .optional()
        .describe('Reminder text for CAN-SPAM compliance (required for create)'),
      filterName: z.string().optional().describe('Filter lists by name (for list action)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of lists to return (for list action)'),
      offset: z.number().optional().describe('Pagination offset (for list action)')
    })
  )
  .output(
    z.object({
      list: z
        .object({
          listId: z.string(),
          name: z.string(),
          stringId: z.string().optional(),
          subscriberCount: z.number().optional()
        })
        .optional(),
      lists: z
        .array(
          z.object({
            listId: z.string(),
            name: z.string(),
            stringId: z.string().optional(),
            subscriberCount: z.number().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    switch (ctx.input.action) {
      case 'create': {
        if (
          !ctx.input.name ||
          !ctx.input.stringId ||
          !ctx.input.senderUrl ||
          !ctx.input.senderReminder
        ) {
          throw new Error(
            'name, stringId, senderUrl, and senderReminder are required for creating a list'
          );
        }
        let result = await client.createList({
          name: ctx.input.name,
          stringid: ctx.input.stringId,
          senderUrl: ctx.input.senderUrl,
          senderReminder: ctx.input.senderReminder
        });
        let list = result.list;
        return {
          output: {
            list: {
              listId: list.id,
              name: list.name,
              stringId: list.stringid || undefined,
              subscriberCount: list.subscriber_count
                ? Number(list.subscriber_count)
                : undefined
            }
          },
          message: `List **${list.name}** (ID: ${list.id}) created.`
        };
      }
      case 'update': {
        if (!ctx.input.listId) throw new Error('listId is required for updating a list');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name) updatePayload.name = ctx.input.name;
        if (ctx.input.stringId) updatePayload.stringid = ctx.input.stringId;
        if (ctx.input.senderUrl) updatePayload.senderUrl = ctx.input.senderUrl;
        if (ctx.input.senderReminder) updatePayload.senderReminder = ctx.input.senderReminder;

        let result = await client.updateList(ctx.input.listId, updatePayload);
        let list = result.list;
        return {
          output: {
            list: {
              listId: list.id,
              name: list.name,
              stringId: list.stringid || undefined
            }
          },
          message: `List **${list.name}** (ID: ${list.id}) updated.`
        };
      }
      case 'delete': {
        if (!ctx.input.listId) throw new Error('listId is required for deleting a list');
        await client.deleteList(ctx.input.listId);
        return {
          output: { deleted: true },
          message: `List (ID: ${ctx.input.listId}) deleted.`
        };
      }
      case 'get': {
        if (!ctx.input.listId) throw new Error('listId is required for getting a list');
        let result = await client.getList(ctx.input.listId);
        let list = result.list;
        return {
          output: {
            list: {
              listId: list.id,
              name: list.name,
              stringId: list.stringid || undefined,
              subscriberCount: list.subscriber_count
                ? Number(list.subscriber_count)
                : undefined
            }
          },
          message: `Retrieved list **${list.name}** (ID: ${list.id}).`
        };
      }
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.filterName) params['filters[name]'] = ctx.input.filterName;
        if (ctx.input.limit) params.limit = ctx.input.limit;
        if (ctx.input.offset) params.offset = ctx.input.offset;

        let result = await client.listLists(params);
        let lists = (result.lists || []).map((l: any) => ({
          listId: l.id,
          name: l.name,
          stringId: l.stringid || undefined,
          subscriberCount: l.subscriber_count ? Number(l.subscriber_count) : undefined
        }));
        return {
          output: { lists },
          message: `Found **${lists.length}** lists.`
        };
      }
    }
  })
  .build();
