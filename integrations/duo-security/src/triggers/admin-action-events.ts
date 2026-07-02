import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let adminActionEvents = SlateTrigger.create(spec, {
  name: 'Admin Action Events',
  key: 'admin_action_events',
  description:
    'Polls Duo for administrator action logs including user creation, policy changes, configuration updates, and other administrative operations.'
})
  .input(
    z.object({
      timestamp: z.number().describe('Unix timestamp of the event'),
      action: z.string().optional().describe('Action performed'),
      username: z.string().optional().describe('Administrator who performed the action'),
      objectType: z.string().optional().describe('Type of object affected'),
      objectName: z.string().optional().describe('Name of the object affected'),
      description: z.string().optional().describe('Description of the action')
    })
  )
  .output(
    z.object({
      timestamp: z.number().describe('Unix timestamp of the event'),
      action: z.string().optional().describe('Action performed'),
      username: z.string().optional().describe('Administrator who performed the action'),
      objectType: z.string().optional().describe('Type of object affected'),
      objectName: z.string().optional().describe('Name of the object affected'),
      description: z.string().optional().describe('Description of the action')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DuoClient({
        integrationKey: ctx.auth.integrationKey,
        secretKey: ctx.auth.secretKey,
        apiHostname: ctx.auth.apiHostname
      });

      let nowSecs = Math.floor(Date.now() / 1000);
      // On first poll, start from 5 minutes ago
      let defaultMintime = String(nowSecs - 5 * 60);
      let mintime = (ctx.state?.lastMintime as string) || defaultMintime;

      let result = await client.getAdministratorLogs({
        mintime,
        limit: 1000
      });

      let logs = result.response || [];

      let inputs = logs.map((log: any) => ({
        timestamp: log.timestamp,
        action: log.action || undefined,
        username: log.username || undefined,
        objectType: log.object || undefined,
        objectName: log.object_name || undefined,
        description: log.description ? JSON.stringify(log.description) : undefined
      }));

      // Advance mintime to latest timestamp + 1 to avoid duplicates
      let latestTimestamp =
        logs.length > 0
          ? Math.max(...logs.map((l: any) => l.timestamp || 0))
          : Number.parseInt(mintime, 10);

      return {
        inputs,
        updatedState: {
          lastMintime: String(latestTimestamp + 1)
        }
      };
    },

    handleEvent: async ctx => {
      let actionType = (ctx.input.action || 'unknown').toLowerCase().replace(/\s+/g, '_');
      return {
        type: `admin.${actionType}`,
        id: `${ctx.input.timestamp}-${ctx.input.action}-${ctx.input.username || 'unknown'}`,
        output: {
          timestamp: ctx.input.timestamp,
          action: ctx.input.action,
          username: ctx.input.username,
          objectType: ctx.input.objectType,
          objectName: ctx.input.objectName,
          description: ctx.input.description
        }
      };
    }
  })
  .build();
