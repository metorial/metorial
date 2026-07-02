import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

export let driveItemChanges = SlateTrigger.create(spec, {
  name: 'Drive Item Changes',
  key: 'drive_item_changes',
  description:
    'Triggers when files or folders are created, updated, or deleted in a SharePoint document library. Polls the drive delta API to detect changes.'
})
  .input(
    z.object({
      driveId: z.string().describe('Drive ID being monitored'),
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('Drive item ID'),
      fileName: z.string().optional().describe('Name of the file or folder'),
      isFolder: z.boolean().optional().describe('Whether this item is a folder'),
      webUrl: z.string().optional().describe('URL of the item'),
      size: z.number().optional().describe('File size in bytes'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      lastModifiedDateTime: z.string().optional().describe('Last modified date'),
      lastModifiedBy: z.string().optional().describe('User who modified the item'),
      parentPath: z.string().optional().describe('Parent folder path')
    })
  )
  .output(
    z.object({
      driveId: z.string().describe('Drive ID'),
      itemId: z.string().describe('Drive item ID'),
      changeType: z.enum(['created', 'updated', 'deleted']).describe('Type of change'),
      fileName: z.string().optional().describe('Name of the file or folder'),
      isFolder: z.boolean().optional().describe('Whether this item is a folder'),
      webUrl: z.string().optional().describe('URL of the item'),
      size: z.number().optional().describe('File size in bytes'),
      mimeType: z.string().optional().describe('MIME type of the file'),
      lastModifiedDateTime: z.string().optional().describe('Last modified date'),
      lastModifiedBy: z.string().optional().describe('User who modified the item'),
      parentPath: z.string().optional().describe('Parent folder path')
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
        driveId?: string;
        initialized?: boolean;
      } | null;

      let driveId = state?.driveId;

      if (!driveId) {
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

      let data = await client.getDelta(driveId, deltaToken);
      let items = data.value || [];
      let newDeltaToken = data['@odata.deltaLink'];
      let nextLink = data['@odata.nextLink'];

      // Process all pages
      let allItems = [...items];
      let currentNextLink = nextLink;
      while (currentNextLink) {
        let nextData = await client.getDelta(driveId, currentNextLink);
        allItems = allItems.concat(nextData.value || []);
        currentNextLink = nextData['@odata.nextLink'];
        if (nextData['@odata.deltaLink']) {
          newDeltaToken = nextData['@odata.deltaLink'];
        }
      }

      if (!state?.initialized) {
        let updatedKnown: Record<string, string> = {};
        for (let item of allItems) {
          let isDeleted = item.deleted !== undefined || item['@removed'] !== undefined;
          if (!isDeleted) {
            updatedKnown[item.id] = item.lastModifiedDateTime || '';
          }
        }
        return {
          inputs: [],
          updatedState: {
            driveId,
            deltaToken: newDeltaToken,
            knownItems: updatedKnown,
            initialized: true
          }
        };
      }

      let inputs: Array<{
        driveId: string;
        changeType: 'created' | 'updated' | 'deleted';
        itemId: string;
        fileName?: string;
        isFolder?: boolean;
        webUrl?: string;
        size?: number;
        mimeType?: string;
        lastModifiedDateTime?: string;
        lastModifiedBy?: string;
        parentPath?: string;
      }> = [];

      let updatedKnown = { ...knownItems };

      for (let item of allItems) {
        let isDeleted = item.deleted !== undefined || item['@removed'] !== undefined;

        if (isDeleted) {
          if (knownItems[item.id]) {
            inputs.push({
              driveId,
              changeType: 'deleted',
              itemId: item.id
            });
            delete updatedKnown[item.id];
          }
        } else if (!knownItems[item.id]) {
          inputs.push({
            driveId,
            changeType: 'created',
            itemId: item.id,
            fileName: item.name,
            isFolder: !!item.folder,
            webUrl: item.webUrl,
            size: item.size,
            mimeType: item.file?.mimeType,
            lastModifiedDateTime: item.lastModifiedDateTime,
            lastModifiedBy: item.lastModifiedBy?.user?.displayName,
            parentPath: item.parentReference?.path
          });
          updatedKnown[item.id] = item.lastModifiedDateTime || '';
        } else {
          inputs.push({
            driveId,
            changeType: 'updated',
            itemId: item.id,
            fileName: item.name,
            isFolder: !!item.folder,
            webUrl: item.webUrl,
            size: item.size,
            mimeType: item.file?.mimeType,
            lastModifiedDateTime: item.lastModifiedDateTime,
            lastModifiedBy: item.lastModifiedBy?.user?.displayName,
            parentPath: item.parentReference?.path
          });
          updatedKnown[item.id] = item.lastModifiedDateTime || '';
        }
      }

      return {
        inputs,
        updatedState: {
          driveId,
          deltaToken: newDeltaToken,
          knownItems: updatedKnown,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let _resourceType = ctx.input.isFolder ? 'folder' : 'file';
      return {
        type: `drive_item.${ctx.input.changeType}`,
        id: `${ctx.input.driveId}_${ctx.input.itemId}_${ctx.input.lastModifiedDateTime || Date.now()}`,
        output: {
          driveId: ctx.input.driveId,
          itemId: ctx.input.itemId,
          changeType: ctx.input.changeType,
          fileName: ctx.input.fileName,
          isFolder: ctx.input.isFolder,
          webUrl: ctx.input.webUrl,
          size: ctx.input.size,
          mimeType: ctx.input.mimeType,
          lastModifiedDateTime: ctx.input.lastModifiedDateTime,
          lastModifiedBy: ctx.input.lastModifiedBy,
          parentPath: ctx.input.parentPath
        }
      };
    }
  })
  .build();
