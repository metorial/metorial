import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let tableDataChanged = SlateTrigger.create(spec, {
  name: 'Table Data Changed',
  key: 'table_data_changed',
  description:
    'Triggers when recently refreshed tables (datatables) are detected. Polls the Nasdaq Data Link databases API to find databases with recently updated datasets.'
})
  .input(
    z.object({
      databaseCode: z.string().describe('Database code that was updated.'),
      databaseName: z.string().describe('Name of the database.'),
      datasetsCount: z.number().describe('Number of datasets in the database.'),
      premium: z.boolean().describe('Whether a subscription is required.')
    })
  )
  .output(
    z.object({
      databaseCode: z.string().describe('Database code.'),
      databaseName: z.string().describe('Database name.'),
      datasetsCount: z.number().describe('Number of datasets in the database.'),
      downloads: z.number().describe('Total number of downloads.'),
      premium: z.boolean().describe('Whether a subscription is required.'),
      description: z.string().describe('Database description.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TablesClient({ apiKey: ctx.auth.token });
      let state = ctx.state || {};
      let seenDatabases: Record<string, number> = state.seenDatabases || {};
      let isFirstPoll = state.isFirstPoll !== false;
      let inputs: Array<{
        databaseCode: string;
        databaseName: string;
        datasetsCount: number;
        premium: boolean;
      }> = [];

      try {
        let response = await client.listDatabases({ perPage: 100 });

        for (let db of response.databases) {
          let previousCount = seenDatabases[db.database_code];

          if (
            !isFirstPoll &&
            (previousCount === undefined || db.datasets_count !== previousCount)
          ) {
            inputs.push({
              databaseCode: db.database_code,
              databaseName: db.name,
              datasetsCount: db.datasets_count,
              premium: db.premium
            });
          }

          seenDatabases[db.database_code] = db.datasets_count;
        }
      } catch (err) {
        ctx.warn(`Failed to poll for database updates: ${err}`);
      }

      return {
        inputs,
        updatedState: {
          seenDatabases,
          isFirstPoll: false
        }
      };
    },

    handleEvent: async ctx => {
      let client = new TablesClient({ apiKey: ctx.auth.token });

      let response = await client.getDatabaseMetadata(ctx.input.databaseCode);
      let db = response.database;

      return {
        type: 'database.updated',
        id: `${ctx.input.databaseCode}:${ctx.input.datasetsCount}`,
        output: {
          databaseCode: db.database_code,
          databaseName: db.name,
          datasetsCount: db.datasets_count,
          downloads: db.downloads,
          premium: db.premium,
          description: db.description || ''
        }
      };
    }
  })
  .build();
