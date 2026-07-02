import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let connectionEvents = SlateTrigger.create(spec, {
  name: 'Connection Events',
  key: 'connection_events',
  description:
    'Detects new or removed connections by polling the Nango connections list. Fires events when connections are created or disappear.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'deleted']).describe('Type of connection event'),
      connectionId: z.string().describe('The connection identifier'),
      provider: z.string().describe('The external service provider'),
      providerConfigKey: z.string().describe('The integration ID'),
      created: z.string().describe('Connection creation timestamp'),
      metadata: z
        .record(z.string(), z.any())
        .nullable()
        .describe('Custom metadata on the connection')
    })
  )
  .output(
    z.object({
      connectionId: z.string().describe('The connection identifier'),
      provider: z.string().describe('The external service provider'),
      providerConfigKey: z.string().describe('The integration ID'),
      created: z.string().describe('Connection creation timestamp'),
      metadata: z
        .record(z.string(), z.any())
        .nullable()
        .describe('Custom metadata on the connection')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NangoClient({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let result = await client.listConnections();
      let currentConnections = result.connections;

      let previousConnectionIds: string[] = ctx.state?.connectionIds ?? [];
      let currentConnectionIds = currentConnections.map(
        c => `${c.provider_config_key}::${c.connection_id}`
      );

      let previousSet = new Set(previousConnectionIds);
      let currentSet = new Set(currentConnectionIds);

      let inputs: {
        eventType: 'created' | 'deleted';
        connectionId: string;
        provider: string;
        providerConfigKey: string;
        created: string;
        metadata: Record<string, any> | null;
      }[] = [];

      // New connections
      for (let conn of currentConnections) {
        let key = `${conn.provider_config_key}::${conn.connection_id}`;
        if (!previousSet.has(key)) {
          inputs.push({
            eventType: 'created',
            connectionId: conn.connection_id,
            provider: conn.provider,
            providerConfigKey: conn.provider_config_key,
            created: conn.created,
            metadata: conn.metadata
          });
        }
      }

      // Deleted connections
      for (let prevKey of previousConnectionIds) {
        if (!currentSet.has(prevKey)) {
          let [providerConfigKey, connectionId] = prevKey.split('::');
          inputs.push({
            eventType: 'deleted',
            connectionId: connectionId ?? prevKey,
            provider: '',
            providerConfigKey: providerConfigKey ?? '',
            created: '',
            metadata: null
          });
        }
      }

      return {
        inputs,
        updatedState: {
          connectionIds: currentConnectionIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `connection.${ctx.input.eventType}`,
        id: `${ctx.input.providerConfigKey}::${ctx.input.connectionId}::${ctx.input.eventType}::${Date.now()}`,
        output: {
          connectionId: ctx.input.connectionId,
          provider: ctx.input.provider,
          providerConfigKey: ctx.input.providerConfigKey,
          created: ctx.input.created,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
