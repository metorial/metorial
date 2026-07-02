import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let datasetUpdated = SlateTrigger.create(spec, {
  name: 'Dataset Updated',
  key: 'dataset_updated',
  description:
    'Triggers when recently refreshed time-series datasets are detected. Polls the Nasdaq Data Link dataset search API to find datasets that have been recently updated.'
})
  .input(
    z.object({
      databaseCode: z.string().describe('Database code of the updated dataset.'),
      datasetCode: z.string().describe('Dataset code of the updated dataset.'),
      name: z.string().describe('Name of the dataset.'),
      refreshedAt: z.string().describe('Timestamp of the latest refresh.'),
      newestDate: z.string().describe('Newest available data date.')
    })
  )
  .output(
    z.object({
      databaseCode: z.string().describe('Database code.'),
      datasetCode: z.string().describe('Dataset code.'),
      name: z.string().describe('Dataset name.'),
      refreshedAt: z.string().describe('Timestamp of the latest refresh.'),
      newestDate: z.string().describe('Newest available data date.'),
      frequency: z.string().describe('Data frequency.'),
      columnNames: z.array(z.string()).describe('Available column names.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TablesClient({ apiKey: ctx.auth.token });
      let state = ctx.state || {};
      let seenRefreshTimes: Record<string, string> = state.seenRefreshTimes || {};
      let inputs: Array<{
        databaseCode: string;
        datasetCode: string;
        name: string;
        refreshedAt: string;
        newestDate: string;
      }> = [];

      try {
        let response = await client.searchDatasets({ query: '*', perPage: 100 });

        for (let ds of response.datasets) {
          let key = `${ds.database_code}/${ds.dataset_code}`;
          let previousRefresh = seenRefreshTimes[key];

          if (ds.refreshed_at && ds.refreshed_at !== previousRefresh) {
            if (previousRefresh) {
              inputs.push({
                databaseCode: ds.database_code,
                datasetCode: ds.dataset_code,
                name: ds.name,
                refreshedAt: ds.refreshed_at,
                newestDate: ds.newest_available_date
              });
            }

            seenRefreshTimes[key] = ds.refreshed_at;
          }
        }
      } catch (err) {
        ctx.warn(`Failed to poll for dataset updates: ${err}`);
      }

      return {
        inputs,
        updatedState: {
          seenRefreshTimes
        }
      };
    },

    handleEvent: async ctx => {
      let client = new TablesClient({ apiKey: ctx.auth.token });

      let response = await client.getTimeSeries({
        databaseCode: ctx.input.databaseCode,
        datasetCode: ctx.input.datasetCode
      });

      let ds = response.dataset;

      return {
        type: 'dataset.updated',
        id: `${ctx.input.databaseCode}/${ctx.input.datasetCode}:${ctx.input.refreshedAt}`,
        output: {
          databaseCode: ds.database_code,
          datasetCode: ds.dataset_code,
          name: ds.name,
          refreshedAt: ds.refreshed_at || ctx.input.refreshedAt,
          newestDate: ds.newest_available_date || ctx.input.newestDate,
          frequency: ds.frequency || '',
          columnNames: ds.column_names || []
        }
      };
    }
  })
  .build();
