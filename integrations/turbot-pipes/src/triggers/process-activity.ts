import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let processActivity = SlateTrigger.create(spec, {
  name: 'Process Activity',
  key: 'process_activity',
  description:
    'Monitors workspace processes for new activity. Tracks pipeline executions, scheduled snapshots, and other asynchronous tasks.'
})
  .input(
    z.object({
      processId: z.string().describe('Process identifier'),
      type: z.string().describe('Process type'),
      state: z.string().describe('Process state'),
      workspaceId: z.string().optional().describe('Workspace identifier'),
      pipelineId: z.string().optional().describe('Associated pipeline ID'),
      createdAt: z.string().describe('Process creation timestamp'),
      updatedAt: z.string().describe('Process last update timestamp')
    })
  )
  .output(
    z.object({
      processId: z.string().describe('Process identifier'),
      type: z.string().describe('Process type (e.g. pipeline_run, snapshot)'),
      state: z.string().describe('Current process state'),
      workspaceId: z.string().optional().describe('Workspace identifier'),
      pipelineId: z.string().optional().describe('Associated pipeline ID'),
      createdAt: z.string().describe('Process creation timestamp'),
      updatedAt: z.string().describe('Process last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let workspaceHandle = ctx.state?.workspaceHandle as string | undefined;
      let ownerHandle = ctx.state?.ownerHandle as string | undefined;

      if (!ownerHandle) {
        let actor = await client.getActor();
        ownerHandle = actor.handle;
      }

      if (!workspaceHandle) {
        let workspaces = await client.listActorWorkspaces({ limit: 1 });
        if (workspaces.items.length > 0) {
          workspaceHandle = workspaces.items[0]!.handle;
        } else {
          return {
            inputs: [],
            updatedState: {
              lastPollTime: new Date().toISOString(),
              ownerHandle,
              workspaceHandle
            }
          };
        }
      }

      let result = await client.listUserProcesses(ownerHandle, workspaceHandle, {
        limit: 50
      });

      let newProcesses = result.items.filter(process => {
        if (!lastPollTime) return true;
        return process.createdAt > lastPollTime || process.updatedAt > lastPollTime;
      });

      let now = new Date().toISOString();

      return {
        inputs: newProcesses.map(process => ({
          processId: process.processId,
          type: process.type || 'unknown',
          state: process.state || 'unknown',
          workspaceId: process.workspaceId,
          pipelineId: process.pipelineId,
          createdAt: process.createdAt,
          updatedAt: process.updatedAt
        })),
        updatedState: {
          lastPollTime: now,
          ownerHandle,
          workspaceHandle
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `process.${ctx.input.state}`,
        id: `${ctx.input.processId}-${ctx.input.updatedAt}`,
        output: {
          processId: ctx.input.processId,
          type: ctx.input.type,
          state: ctx.input.state,
          workspaceId: ctx.input.workspaceId,
          pipelineId: ctx.input.pipelineId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
