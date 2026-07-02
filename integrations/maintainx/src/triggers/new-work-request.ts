import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newWorkRequest = SlateTrigger.create(spec, {
  name: 'New Work Request',
  key: 'new_work_request',
  description: 'Triggers when a new work request is created in MaintainX.'
})
  .input(
    z.object({
      workRequestId: z.number().describe('Work request ID'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      workRequestId: z.number().describe('Work request ID'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status'),
      priority: z.string().optional().describe('Priority'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;

      let result = await client.listWorkRequests({ limit: 50 });
      let workRequests: any[] = result.workRequests ?? [];

      // Sort by id ascending
      workRequests.sort((a: any, b: any) => a.id - b.id);

      // Filter to only new requests
      let newRequests =
        lastSeenId !== undefined
          ? workRequests.filter((wr: any) => wr.id > lastSeenId)
          : workRequests;

      let newLastSeenId = lastSeenId;
      if (newRequests.length > 0) {
        newLastSeenId = newRequests[newRequests.length - 1].id;
      }

      return {
        inputs: newRequests.map((wr: any) => ({
          workRequestId: wr.id,
          title: wr.title,
          description: wr.description,
          status: wr.status,
          createdAt: wr.createdAt
        })),
        updatedState: {
          lastSeenId: newLastSeenId ?? lastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'work_request.created',
        id: `work_request_created_${ctx.input.workRequestId}`,
        output: {
          workRequestId: ctx.input.workRequestId,
          title: ctx.input.title,
          description: ctx.input.description,
          status: ctx.input.status,
          priority: undefined,
          createdAt: ctx.input.createdAt,
          updatedAt: undefined
        }
      };
    }
  })
  .build();
