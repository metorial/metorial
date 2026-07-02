import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let workbookChanged = SlateTrigger.create(spec, {
  name: 'Workbook File Changed',
  key: 'workbook_changed',
  description:
    'Triggers when an Excel workbook (.xlsx) file is created, modified, or deleted in the configured drive. Uses the Microsoft Graph Delta API to detect changes efficiently.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      itemId: z.string().describe('Drive item ID of the changed file'),
      fileName: z.string().describe('Name of the changed file'),
      webUrl: z.string().optional().describe('Web URL of the file'),
      lastModifiedDateTime: z.string().optional().describe('Last modified timestamp'),
      lastModifiedBy: z
        .string()
        .optional()
        .describe('Display name of user who last modified the file'),
      size: z.number().optional().describe('File size in bytes'),
      parentPath: z.string().optional().describe('Parent folder path')
    })
  )
  .output(
    z.object({
      workbookItemId: z.string().describe('Drive item ID of the changed workbook'),
      fileName: z.string().describe('Name of the workbook file'),
      changeType: z.enum(['created', 'updated', 'deleted']).describe('Type of change'),
      webUrl: z.string().optional().describe('Web URL of the workbook'),
      lastModifiedDateTime: z.string().optional().describe('Last modified timestamp'),
      lastModifiedBy: z.string().optional().describe('Display name of the last modifier'),
      size: z.number().optional().describe('File size in bytes'),
      parentPath: z.string().optional().describe('Parent folder path')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ExcelClient({
        token: ctx.auth.token,
        driveId: ctx.config.driveId,
        siteId: ctx.config.siteId
      });

      let deltaToken = ctx.state?.deltaToken as string | undefined;
      let knownItems = (ctx.state?.knownItems || {}) as Record<string, string>;

      let deltaResponse = await client.getDelta(ctx.config.driveId, deltaToken);
      let items: any[] = deltaResponse.value || [];
      let nextDeltaLink = deltaResponse['@odata.deltaLink'];
      let nextLink = deltaResponse['@odata.nextLink'];

      // Follow pagination if needed
      while (nextLink) {
        let nextResponse = await client.getDelta(undefined, nextLink);
        items = items.concat(nextResponse.value || []);
        nextDeltaLink = nextResponse['@odata.deltaLink'];
        nextLink = nextResponse['@odata.nextLink'];
      }

      // Filter for .xlsx files only
      let xlsxItems = items.filter(
        (item: any) =>
          item.name?.endsWith('.xlsx') ||
          item.file?.mimeType ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      let inputs: any[] = [];
      let updatedKnownItems = { ...knownItems };

      // On first poll (no delta token), just record known items without emitting events
      if (!deltaToken) {
        for (let item of xlsxItems) {
          if (!item.deleted) {
            updatedKnownItems[item.id] = item.lastModifiedDateTime || '';
          }
        }
      } else {
        for (let item of xlsxItems) {
          let changeType: 'created' | 'updated' | 'deleted';

          if (item.deleted) {
            changeType = 'deleted';
            delete updatedKnownItems[item.id];
          } else if (!knownItems[item.id]) {
            changeType = 'created';
            updatedKnownItems[item.id] = item.lastModifiedDateTime || '';
          } else {
            changeType = 'updated';
            updatedKnownItems[item.id] = item.lastModifiedDateTime || '';
          }

          inputs.push({
            changeType,
            itemId: item.id,
            fileName: item.name || 'unknown',
            webUrl: item.webUrl,
            lastModifiedDateTime: item.lastModifiedDateTime,
            lastModifiedBy: item.lastModifiedBy?.user?.displayName,
            size: item.size,
            parentPath: item.parentReference?.path
          });
        }
      }

      return {
        inputs,
        updatedState: {
          deltaToken: nextDeltaLink,
          knownItems: updatedKnownItems
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workbook.${ctx.input.changeType}`,
        id: `${ctx.input.itemId}-${ctx.input.lastModifiedDateTime || Date.now()}`,
        output: {
          workbookItemId: ctx.input.itemId,
          fileName: ctx.input.fileName,
          changeType: ctx.input.changeType,
          webUrl: ctx.input.webUrl,
          lastModifiedDateTime: ctx.input.lastModifiedDateTime,
          lastModifiedBy: ctx.input.lastModifiedBy,
          size: ctx.input.size,
          parentPath: ctx.input.parentPath
        }
      };
    }
  })
  .build();
