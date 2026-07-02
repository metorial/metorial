import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeDataSource } from '../lib/helpers';
import { spec } from '../spec';

export let dataSourceEvents = SlateTrigger.create(spec, {
  name: 'Data Source Events',
  key: 'data_source_events',
  description:
    'Triggered when a new database connection is added to the workspace. Configure the webhook in Mode Workspace Settings > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Mode event name'),
      connectionUrl: z.string().optional().describe('API URL to the data source resource'),
      dataSourceToken: z.string().optional().describe('Extracted data source token')
    })
  )
  .output(
    z.object({
      dataSourceToken: z.string().describe('Token of the data source'),
      name: z.string().describe('Name of the data source'),
      description: z.string().describe('Description'),
      adapter: z.string().describe('Database adapter type'),
      host: z.string().describe('Database host'),
      database: z.string().describe('Database name'),
      port: z.number().describe('Database port'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';

      if (eventName !== 'new_database_connection') {
        return { inputs: [] };
      }

      let connectionUrl = body.connection_url || '';
      let dataSourceToken = '';

      // Extract token from URL: .../api/{workspace}/data_sources/{token}
      if (connectionUrl) {
        let parts = connectionUrl.split('/');
        let dsIdx = parts.indexOf('data_sources');
        if (dsIdx >= 0 && parts.length > dsIdx + 1) {
          dataSourceToken = parts[dsIdx + 1];
        }
      }

      return {
        inputs: [
          {
            eventName,
            connectionUrl,
            dataSourceToken
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { dataSourceToken } = ctx.input;

      if (dataSourceToken) {
        try {
          let client = new ModeClient({
            token: ctx.auth.token,
            secret: ctx.auth.secret,
            workspaceName: ctx.config.workspaceName
          });
          let raw = await client.getDataSource(dataSourceToken);
          let ds = normalizeDataSource(raw);
          return {
            type: 'data_source.created',
            id: `new_database_connection_${dataSourceToken}`,
            output: ds
          };
        } catch {
          // Fall through
        }
      }

      return {
        type: 'data_source.created',
        id: `new_database_connection_${dataSourceToken || Date.now()}`,
        output: {
          dataSourceToken: dataSourceToken || '',
          name: '',
          description: '',
          adapter: '',
          host: '',
          database: '',
          port: 0,
          createdAt: '',
          updatedAt: ''
        }
      };
    }
  })
  .build();
