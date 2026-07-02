import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEvaluations = SlateTrigger.create(spec, {
  name: 'New Evaluations',
  key: 'new_evaluations',
  description:
    'Triggers when new evaluation runs are created. Polls for newly created evaluations. Store the fileId to monitor in the initial state.'
})
  .input(
    z.object({
      evaluationId: z.string().describe('ID of the evaluation'),
      fileId: z.string().describe('File ID the evaluation belongs to'),
      evaluationName: z.string().optional().describe('Name of the evaluation'),
      status: z.string().optional().describe('Status of the evaluation'),
      createdAt: z.string().optional().describe('Timestamp when the evaluation was created')
    })
  )
  .output(
    z.object({
      evaluationId: z.string().describe('ID of the evaluation'),
      fileId: z.string().describe('File ID the evaluation belongs to'),
      evaluationName: z.string().optional().describe('Name of the evaluation'),
      status: z.string().optional().describe('Status of the evaluation'),
      createdAt: z.string().optional().describe('Timestamp when created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let fileId = ctx.state?.fileId as string | undefined;
      if (!fileId) {
        return { inputs: [], updatedState: ctx.state || {} };
      }

      let lastSeenIds = (ctx.state?.lastSeenIds as string[] | undefined) || [];

      let result = await client.listEvaluations(fileId, {
        page: 1,
        size: 50
      });

      let records = result.records || [];

      let newRecords =
        lastSeenIds.length > 0
          ? records.filter((r: any) => !lastSeenIds.includes(r.id))
          : records;

      let allIds = records.map((r: any) => r.id).slice(0, 100);

      return {
        inputs: newRecords.map((record: any) => ({
          evaluationId: record.id,
          fileId,
          evaluationName: record.name,
          status: record.status,
          createdAt: record.created_at
        })),
        updatedState: {
          fileId,
          lastSeenIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'evaluation.created',
        id: ctx.input.evaluationId,
        output: {
          evaluationId: ctx.input.evaluationId,
          fileId: ctx.input.fileId,
          evaluationName: ctx.input.evaluationName,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
