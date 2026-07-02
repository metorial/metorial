import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DriveClient, SheetsClient } from '../lib/client';
import { spec } from '../spec';

export let spreadsheetChangedTrigger = SlateTrigger.create(spec, {
  name: 'Spreadsheet Changed',
  key: 'spreadsheet_changed',
  description:
    'Triggers when a Google Sheets spreadsheet is modified. Uses Google Drive API to detect file changes and polls periodically to check for updates.'
})
  .input(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      changeId: z.string().describe('Unique identifier for this change event'),
      modifiedTime: z.string().describe('Timestamp when the spreadsheet was modified'),
      spreadsheetTitle: z.string().optional().describe('Title of the spreadsheet'),
      modifiedByEmail: z.string().optional().describe('Email of the user who modified')
    })
  )
  .output(
    z.object({
      spreadsheetId: z.string().describe('ID of the spreadsheet'),
      title: z.string().describe('Title of the spreadsheet'),
      modifiedTime: z.string().describe('When the spreadsheet was modified'),
      modifiedBy: z.string().optional().describe('Email of the modifier'),
      spreadsheetUrl: z.string().optional().describe('URL to open the spreadsheet'),
      sheetCount: z.number().optional().describe('Number of sheets in the spreadsheet')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let driveClient = new DriveClient(ctx.auth.token);

      // Get the spreadsheet IDs to monitor from state
      let watchedSpreadsheets = (ctx.state?.watchedSpreadsheets || []) as string[];
      let lastModifiedTimes = (ctx.state?.lastModifiedTimes || {}) as Record<string, string>;

      let inputs: {
        spreadsheetId: string;
        changeId: string;
        modifiedTime: string;
        spreadsheetTitle?: string;
        modifiedByEmail?: string;
      }[] = [];

      for (let spreadsheetId of watchedSpreadsheets) {
        try {
          let fileInfo = await driveClient.getFile(spreadsheetId);

          if (!fileInfo.modifiedTime) {
            continue;
          }

          let lastModified = lastModifiedTimes[spreadsheetId];

          if (!lastModified || fileInfo.modifiedTime > lastModified) {
            // Only emit event if this isn't the first check
            if (lastModified) {
              inputs.push({
                spreadsheetId,
                changeId: `${spreadsheetId}-${fileInfo.modifiedTime}`,
                modifiedTime: fileInfo.modifiedTime,
                spreadsheetTitle: fileInfo.name,
                modifiedByEmail: fileInfo.owners?.[0]?.emailAddress
              });
            }

            lastModifiedTimes[spreadsheetId] = fileInfo.modifiedTime;
          }
        } catch (error) {
          ctx.warn(`Failed to check spreadsheet ${spreadsheetId}: ${error}`);
        }
      }

      return {
        inputs,
        updatedState: {
          watchedSpreadsheets,
          lastModifiedTimes
        }
      };
    },

    handleEvent: async ctx => {
      let sheetsClient = new SheetsClient({ token: ctx.auth.token });

      let spreadsheet = await sheetsClient.getSpreadsheet(ctx.input.spreadsheetId);

      return {
        type: 'spreadsheet.changed',
        id: ctx.input.changeId,
        output: {
          spreadsheetId: ctx.input.spreadsheetId,
          title: spreadsheet.properties.title,
          modifiedTime: ctx.input.modifiedTime,
          modifiedBy: ctx.input.modifiedByEmail,
          spreadsheetUrl: spreadsheet.spreadsheetUrl,
          sheetCount: spreadsheet.sheets?.length
        }
      };
    }
  })
  .build();
