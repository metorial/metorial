import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

export let listItemChanges = SlateTrigger.create(spec, {
  name: 'List Item Changes',
  key: 'list_item_changes',
  description:
    'Triggers when list items are created, updated, or deleted in a SharePoint list. Polls the list items delta API to detect changes.'
})
  .input(
    z.object({
      siteId: z.string().describe('SharePoint site ID to monitor'),
      listId: z.string().describe('SharePoint list ID to monitor'),
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('ID of the changed list item'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current field values of the item (not present for deletions)'),
      lastModifiedDateTime: z.string().optional().describe('When the item was last modified'),
      lastModifiedBy: z.string().optional().describe('User who last modified the item')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('SharePoint site ID'),
      listId: z.string().describe('SharePoint list ID'),
      itemId: z.string().describe('ID of the changed list item'),
      changeType: z.enum(['created', 'updated', 'deleted']).describe('Type of change'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current field values (not present for deletions)'),
      lastModifiedDateTime: z.string().optional().describe('When the item was last modified'),
      lastModifiedBy: z.string().optional().describe('User who last modified the item'),
      webUrl: z.string().optional().describe('URL of the list item')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SharePointClient(ctx.auth.token);
      let state = ctx.state as {
        deltaToken?: string;
        knownItems?: Record<string, string>;
        siteId?: string;
        listId?: string;
        initialized?: boolean;
      } | null;

      let siteId = state?.siteId;
      let listId = state?.listId;

      if (!siteId || !listId) {
        return {
          inputs: [],
          updatedState: {
            ...state,
            initialized: false
          }
        };
      }

      let deltaToken = state?.deltaToken;
      let knownItems = state?.knownItems || {};

      let data = await client.getListItemsDelta(siteId, listId, deltaToken);
      let items = data.value || [];
      let newDeltaToken = data['@odata.deltaLink'];

      if (!state?.initialized) {
        let updatedKnown: Record<string, string> = {};
        for (let item of items) {
          let isDeleted = item.deleted !== undefined || item['@removed'] !== undefined;
          if (!isDeleted) {
            updatedKnown[item.id] = item.lastModifiedDateTime || '';
          }
        }
        return {
          inputs: [],
          updatedState: {
            siteId,
            listId,
            deltaToken: newDeltaToken,
            knownItems: updatedKnown,
            initialized: true
          }
        };
      }

      let inputs: Array<{
        siteId: string;
        listId: string;
        changeType: 'created' | 'updated' | 'deleted';
        itemId: string;
        fields?: Record<string, any>;
        lastModifiedDateTime?: string;
        lastModifiedBy?: string;
      }> = [];

      let updatedKnown = { ...knownItems };

      for (let item of items) {
        let isDeleted = item.deleted !== undefined || item['@removed'] !== undefined;

        if (isDeleted) {
          if (knownItems[item.id]) {
            inputs.push({
              siteId,
              listId,
              changeType: 'deleted',
              itemId: item.id
            });
            delete updatedKnown[item.id];
          }
        } else if (!knownItems[item.id]) {
          inputs.push({
            siteId,
            listId,
            changeType: 'created',
            itemId: item.id,
            fields: item.fields,
            lastModifiedDateTime: item.lastModifiedDateTime,
            lastModifiedBy: item.lastModifiedBy?.user?.displayName
          });
          updatedKnown[item.id] = item.lastModifiedDateTime || '';
        } else {
          inputs.push({
            siteId,
            listId,
            changeType: 'updated',
            itemId: item.id,
            fields: item.fields,
            lastModifiedDateTime: item.lastModifiedDateTime,
            lastModifiedBy: item.lastModifiedBy?.user?.displayName
          });
          updatedKnown[item.id] = item.lastModifiedDateTime || '';
        }
      }

      return {
        inputs,
        updatedState: {
          siteId,
          listId,
          deltaToken: newDeltaToken,
          knownItems: updatedKnown,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `list_item.${ctx.input.changeType}`,
        id: `${ctx.input.listId}_${ctx.input.itemId}_${ctx.input.lastModifiedDateTime || Date.now()}`,
        output: {
          siteId: ctx.input.siteId,
          listId: ctx.input.listId,
          itemId: ctx.input.itemId,
          changeType: ctx.input.changeType,
          fields: ctx.input.fields,
          lastModifiedDateTime: ctx.input.lastModifiedDateTime,
          lastModifiedBy: ctx.input.lastModifiedBy
        }
      };
    }
  })
  .build();
