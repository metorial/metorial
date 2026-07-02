import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let datasourceChanges = SlateTrigger.create(spec, {
  name: 'Data Source Changes',
  key: 'datasource_changes',
  description:
    'Detects new or refreshed data sources by polling the data sources list and comparing refresh timestamps.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'refreshed']).describe('Type of change detected'),
      datasourceId: z.string().describe('Data source ID'),
      name: z.string().describe('Data source name'),
      connector: z.string().optional().describe('Connector type'),
      dateLastRefresh: z.string().optional().describe('Last refresh timestamp')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().describe('ID of the data source'),
      name: z.string().describe('Name of the data source'),
      connector: z.string().optional().describe('Connector type'),
      dateLastRefresh: z.string().optional().describe('Last refresh timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listDatasources({ limit: 100 });
      let datasources = result?.data || [];

      let previousMap: Record<string, string> = ctx.state?.datasourceRefreshMap || {};
      let inputs: Array<{
        changeType: 'created' | 'refreshed';
        datasourceId: string;
        name: string;
        connector?: string;
        dateLastRefresh?: string;
      }> = [];
      let newMap: Record<string, string> = {};

      for (let ds of datasources) {
        let dsId = ds.id;
        let lastRefresh = ds.date_last_refresh || '';
        newMap[dsId] = lastRefresh;

        if (!previousMap[dsId]) {
          inputs.push({
            changeType: 'created',
            datasourceId: dsId,
            name: ds.name,
            connector: ds.connector,
            dateLastRefresh: lastRefresh || undefined
          });
        } else if (previousMap[dsId] !== lastRefresh && lastRefresh) {
          inputs.push({
            changeType: 'refreshed',
            datasourceId: dsId,
            name: ds.name,
            connector: ds.connector,
            dateLastRefresh: lastRefresh
          });
        }
      }

      return {
        inputs,
        updatedState: { datasourceRefreshMap: newMap }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `datasource.${ctx.input.changeType}`,
        id: `${ctx.input.datasourceId}-${ctx.input.dateLastRefresh || ctx.input.changeType}`,
        output: {
          datasourceId: ctx.input.datasourceId,
          name: ctx.input.name,
          connector: ctx.input.connector,
          dateLastRefresh: ctx.input.dateLastRefresh
        }
      };
    }
  })
  .build();
