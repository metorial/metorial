import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let featureChanges = SlateTrigger.create(spec, {
  name: 'Feature Changes',
  key: 'feature_changes',
  description:
    'Triggers when features are created or updated in Aha!. Polls for recently modified features across all products.'
})
  .input(
    z.object({
      featureId: z.string().describe('Feature ID'),
      referenceNum: z.string().describe('Feature reference number'),
      name: z.string().describe('Feature name'),
      status: z.string().optional().describe('Workflow status name'),
      assignee: z.string().optional().describe('Assigned user name'),
      url: z.string().optional().describe('Feature URL'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      featureId: z.string().describe('Feature ID'),
      referenceNum: z.string().describe('Feature reference number'),
      name: z.string().describe('Feature name'),
      status: z.string().optional().describe('Workflow status name'),
      assignee: z.string().optional().describe('Assigned user name'),
      url: z.string().optional().describe('Feature URL'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
      let state = ctx.state as { lastPollTime?: string } | null;

      let updatedSince = state?.lastPollTime;
      let now = new Date().toISOString();

      try {
        let result = await client.listFeatures({
          updatedSince,
          perPage: 100
        });

        let inputs = result.features.map(f => ({
          featureId: f.id,
          referenceNum: f.reference_num,
          name: f.name,
          status: f.workflow_status?.name,
          assignee: f.assigned_to_user?.name,
          url: f.url,
          updatedAt: f.updated_at
        }));

        return {
          inputs,
          updatedState: {
            lastPollTime: now
          }
        };
      } catch {
        return {
          inputs: [],
          updatedState: {
            lastPollTime: updatedSince || now
          }
        };
      }
    },

    handleEvent: async ctx => {
      return {
        type: 'feature.updated',
        id: `feature-${ctx.input.featureId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          featureId: ctx.input.featureId,
          referenceNum: ctx.input.referenceNum,
          name: ctx.input.name,
          status: ctx.input.status,
          assignee: ctx.input.assignee,
          url: ctx.input.url,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
