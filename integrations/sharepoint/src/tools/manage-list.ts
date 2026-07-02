import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let listOutputSchema = z.object({
  listId: z.string().describe('Unique list ID'),
  listName: z.string().describe('Display name of the list'),
  listDescription: z.string().nullable().describe('List description'),
  webUrl: z.string().optional().describe('URL of the list'),
  createdDateTime: z.string().optional().describe('When the list was created'),
  lastModifiedDateTime: z.string().optional().describe('When the list was last modified'),
  template: z.string().optional().describe('List template type'),
  itemCount: z.number().optional().describe('Number of items in the list')
});

export let manageList = SlateTool.create(spec, {
  name: 'Manage List',
  key: 'manage_list',
  description: `Create, read, update, or delete SharePoint lists within a site. Also supports listing all lists on a site. Lists are the foundation for data storage in SharePoint and can represent custom business data, contact lists, task trackers, and more.`,
  instructions: [
    'Set **action** to "get" to retrieve a single list, "list" to list all lists on a site, "create" to create a new list, "update" to rename or re-describe a list, or "delete" to remove a list.',
    'For "create", provide **displayName** and optionally **template** (defaults to "genericList").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      siteId: z.string().describe('SharePoint site ID'),
      listId: z.string().optional().describe('List ID (required for get, update, delete)'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the list (for create/update)'),
      description: z
        .string()
        .optional()
        .describe('Description for the list (for create/update)'),
      template: z
        .string()
        .optional()
        .describe(
          'List template, e.g. "genericList", "documentLibrary", "events" (for create, defaults to "genericList")'
        )
    })
  )
  .output(
    z.object({
      list: listOutputSchema
        .optional()
        .describe('Single list details (for get, create, update)'),
      lists: z.array(listOutputSchema).optional().describe('All lists (for list action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the list was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let { action, siteId, listId, displayName, description, template } = ctx.input;

    let mapList = (l: any) => ({
      listId: l.id,
      listName: l.displayName,
      listDescription: l.description || null,
      webUrl: l.webUrl,
      createdDateTime: l.createdDateTime,
      lastModifiedDateTime: l.lastModifiedDateTime,
      template: l.list?.template,
      itemCount: l.list?.contentTypesEnabled != null ? undefined : undefined
    });

    switch (action) {
      case 'get': {
        if (!listId) throw new Error('listId is required for get action.');
        let list = await client.getList(siteId, listId);
        return {
          output: { list: mapList(list) },
          message: `Retrieved list **${list.displayName}** (${list.id}).`
        };
      }

      case 'list': {
        let data = await client.listLists(siteId);
        let lists = (data.value || []).map(mapList);
        return {
          output: { lists },
          message: `Found **${lists.length}** list(s) on site.`
        };
      }

      case 'create': {
        if (!displayName) throw new Error('displayName is required for create action.');
        let list = await client.createList(siteId, displayName, template || 'genericList');
        if (description) {
          list = await client.updateList(siteId, list.id, { description });
        }
        return {
          output: { list: mapList(list) },
          message: `Created list **${displayName}**.`
        };
      }

      case 'update': {
        if (!listId) throw new Error('listId is required for update action.');
        let updates: any = {};
        if (displayName) updates.displayName = displayName;
        if (description !== undefined) updates.description = description;
        let list = await client.updateList(siteId, listId, updates);
        return {
          output: { list: mapList(list) },
          message: `Updated list **${list.displayName}**.`
        };
      }

      case 'delete': {
        if (!listId) throw new Error('listId is required for delete action.');
        await client.deleteList(siteId, listId);
        return {
          output: { deleted: true },
          message: `Deleted list \`${listId}\`.`
        };
      }
    }
  })
  .build();
