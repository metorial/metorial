import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeResource } from '../lib/helpers';
import { spec } from '../spec';

export let listLists = SlateTool.create(spec, {
  name: 'List Lists',
  key: 'list_lists',
  description: `Retrieve all screening lists (blocklists, allowlists) in your Persona organization. Lists contain sets of identifiers used for screening purposes.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('List ID'),
            listType: z.string().optional().describe('List type'),
            name: z.string().optional().describe('List name'),
            status: z.string().optional().describe('List status'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of screening lists'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listLists({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let lists = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        listId: item.id,
        listType: item.type,
        name: n.name,
        status: n.status,
        createdAt: n['created-at'] || n.created_at
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { lists, nextCursor },
      message: `Found **${lists.length}** lists.`
    };
  })
  .build();

export let getListItems = SlateTool.create(spec, {
  name: 'Get List Items',
  key: 'get_list_items',
  description: `Retrieve items from a specific screening list. Items represent individual identifiers (emails, phone numbers, government IDs, etc.) contained in the list.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      listId: z.string().describe('Persona list ID'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageCursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      listItems: z
        .array(
          z.object({
            listItemId: z.string().describe('List item ID'),
            listItemType: z.string().optional().describe('List item type'),
            status: z.string().optional().describe('Item status'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Item attributes (value, etc.)')
          })
        )
        .describe('List items'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listListItems(ctx.input.listId, {
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });

    let listItems = (result.data || []).map((item: any) => {
      let n = normalizeResource(item);
      return {
        listItemId: item.id,
        listItemType: item.type,
        status: n.status,
        attributes: n
      };
    });

    let nextCursor: string | undefined;
    if (result.links?.next) {
      try {
        let parsed = new URL(result.links.next, 'https://withpersona.com');
        nextCursor = parsed.searchParams.get('page[after]') || undefined;
      } catch {
        /* ignore */
      }
    }

    return {
      output: { listItems, nextCursor },
      message: `Found **${listItems.length}** items in list **${ctx.input.listId}**.`
    };
  })
  .build();

export let createListItem = SlateTool.create(spec, {
  name: 'Create List Item',
  key: 'create_list_item',
  description: `Add a new item to a screening list. The item type and required attributes depend on the list type (email, phone, government ID, name, etc.).`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      listId: z.string().describe('Persona list ID to add the item to'),
      value: z
        .string()
        .optional()
        .describe('Primary value for the list item (email, phone number, etc.)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional item attributes specific to the list type')
    })
  )
  .output(
    z.object({
      listItemId: z.string().describe('Created list item ID'),
      listItemType: z.string().optional().describe('List item type'),
      attributes: z.record(z.string(), z.any()).optional().describe('Item attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let attrs: Record<string, any> = ctx.input.attributes || {};
    if (ctx.input.value) attrs.value = ctx.input.value;

    let result = await client.createListItem(ctx.input.listId, attrs);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        listItemId: result.data?.id,
        listItemType: result.data?.type,
        attributes: normalized
      },
      message: `Added item **${result.data?.id}** to list **${ctx.input.listId}**.`
    };
  })
  .build();

export let archiveListItem = SlateTool.create(spec, {
  name: 'Archive List Item',
  key: 'archive_list_item',
  description: `Archive (soft-delete) an item from a screening list. The item will no longer be active for screening purposes.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      listItemId: z.string().describe('List item ID to archive')
    })
  )
  .output(
    z.object({
      listItemId: z.string().describe('Archived list item ID'),
      status: z.string().optional().describe('Updated status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.archiveListItem(ctx.input.listItemId);
    let normalized = normalizeResource(result.data);

    return {
      output: {
        listItemId: result.data?.id || ctx.input.listItemId,
        status: normalized.status
      },
      message: `Archived list item **${ctx.input.listItemId}**.`
    };
  })
  .build();
