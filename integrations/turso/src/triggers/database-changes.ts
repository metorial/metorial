import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let databaseChanges = SlateTrigger.create(spec, {
  name: 'Database Changes',
  key: 'database_changes',
  description:
    'Polls for database additions and removals in the organization. Triggers when new databases are created or existing ones are deleted.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'deleted']).describe('Type of change detected'),
      databaseName: z.string().describe('Name of the affected database'),
      databaseId: z.string().describe('Unique identifier of the database'),
      hostname: z.string().optional().describe('Hostname (for created databases)'),
      group: z.string().optional().describe('Group the database belongs to'),
      primaryRegion: z.string().optional().describe('Primary region of the database')
    })
  )
  .output(
    z.object({
      databaseName: z.string().describe('Name of the affected database'),
      databaseId: z.string().describe('Unique identifier of the database'),
      hostname: z.string().optional().describe('Hostname for connecting to the database'),
      group: z.string().optional().describe('Group the database belongs to'),
      primaryRegion: z.string().optional().describe('Primary region of the database')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationSlug: ctx.config.organizationSlug
      });

      let result = await client.listDatabases();
      let currentDatabases = result.databases;

      let previousDatabaseIds =
        ((ctx.state as Record<string, unknown>)?.databaseIds as string[] | undefined) ?? [];

      let currentDatabaseIds = currentDatabases.map(db => db.DbId);

      let inputs: Array<{
        changeType: 'created' | 'deleted';
        databaseName: string;
        databaseId: string;
        hostname?: string;
        group?: string;
        primaryRegion?: string;
      }> = [];

      // Only detect changes if we have a previous state (not the first poll)
      if (
        previousDatabaseIds.length > 0 ||
        (ctx.state as Record<string, unknown>)?.initialized
      ) {
        // Find newly created databases
        for (let db of currentDatabases) {
          if (!previousDatabaseIds.includes(db.DbId)) {
            inputs.push({
              changeType: 'created',
              databaseName: db.Name,
              databaseId: db.DbId,
              hostname: db.Hostname,
              group: db.group,
              primaryRegion: db.primaryRegion
            });
          }
        }

        // Find deleted databases
        let previousDbMap =
          ((ctx.state as Record<string, unknown>)?.databaseMap as
            | Record<string, { name: string }>
            | undefined) ?? {};
        for (let prevId of previousDatabaseIds) {
          if (!currentDatabaseIds.includes(prevId)) {
            let prevDb = previousDbMap[prevId];
            inputs.push({
              changeType: 'deleted',
              databaseName: prevDb?.name ?? prevId,
              databaseId: prevId
            });
          }
        }
      }

      let databaseMap: Record<string, { name: string }> = {};
      for (let db of currentDatabases) {
        databaseMap[db.DbId] = { name: db.Name };
      }

      return {
        inputs,
        updatedState: {
          initialized: true,
          databaseIds: currentDatabaseIds,
          databaseMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `database.${ctx.input.changeType}`,
        id: `${ctx.input.databaseId}-${ctx.input.changeType}`,
        output: {
          databaseName: ctx.input.databaseName,
          databaseId: ctx.input.databaseId,
          hostname: ctx.input.hostname,
          group: ctx.input.group,
          primaryRegion: ctx.input.primaryRegion
        }
      };
    }
  })
  .build();
