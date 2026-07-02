import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let databaseChanges = SlateTrigger.create(spec, {
  name: 'Database Changes',
  key: 'database_changes',
  description:
    'Polls for new, updated, or deleted Prisma Postgres databases. Detects when databases are created, change status, or are removed.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of database change event'),
      databaseId: z.string().describe('ID of the affected database'),
      databaseName: z.string().describe('Name of the affected database'),
      region: z.string().optional().describe('Region of the database'),
      status: z.string().optional().describe('Current status of the database'),
      projectId: z.string().optional().describe('Parent project ID'),
      projectName: z.string().optional().describe('Parent project name')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the affected database'),
      databaseName: z.string().describe('Name of the affected database'),
      region: z.string().optional().describe('Region of the database'),
      status: z.string().optional().describe('Current status of the database'),
      projectId: z.string().optional().describe('Parent project ID'),
      projectName: z.string().optional().describe('Parent project name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new PrismaClient(ctx.auth.token);
      let currentDatabases = await client.listDatabases();

      let previousDatabaseMap: Record<string, { status?: string; name?: string }> =
        ctx.state?.databaseMap ?? {};
      let inputs: Array<{
        eventType: 'created' | 'updated' | 'deleted';
        databaseId: string;
        databaseName: string;
        region?: string;
        status?: string;
        projectId?: string;
        projectName?: string;
      }> = [];

      let currentIds = new Set<string>();

      for (let db of currentDatabases) {
        currentIds.add(db.id);
        let previous = previousDatabaseMap[db.id];

        if (!previous) {
          inputs.push({
            eventType: 'created',
            databaseId: db.id,
            databaseName: db.name,
            region: db.region,
            status: db.status,
            projectId: db.project?.id,
            projectName: db.project?.name
          });
        } else if (previous.status !== db.status || previous.name !== db.name) {
          inputs.push({
            eventType: 'updated',
            databaseId: db.id,
            databaseName: db.name,
            region: db.region,
            status: db.status,
            projectId: db.project?.id,
            projectName: db.project?.name
          });
        }
      }

      for (let [prevId, prevData] of Object.entries(previousDatabaseMap)) {
        if (!currentIds.has(prevId)) {
          inputs.push({
            eventType: 'deleted',
            databaseId: prevId,
            databaseName: prevData.name ?? prevId
          });
        }
      }

      let newDatabaseMap: Record<string, { status?: string; name?: string }> = {};
      for (let db of currentDatabases) {
        newDatabaseMap[db.id] = { status: db.status, name: db.name };
      }

      return {
        inputs,
        updatedState: {
          databaseMap: newDatabaseMap
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `database.${ctx.input.eventType}`,
        id: `${ctx.input.databaseId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          databaseId: ctx.input.databaseId,
          databaseName: ctx.input.databaseName,
          region: ctx.input.region,
          status: ctx.input.status,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName
        }
      };
    }
  })
  .build();
