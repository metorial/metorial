import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let ideaChanges = SlateTrigger.create(spec, {
  name: 'Idea Changes',
  key: 'idea_changes',
  description:
    'Triggers when ideas are created or updated in Aha!. Polls for recently modified ideas across all products.'
})
  .input(
    z.object({
      ideaId: z.string().describe('Idea ID'),
      referenceNum: z.string().describe('Idea reference number'),
      name: z.string().describe('Idea name'),
      status: z.string().optional().describe('Workflow status name'),
      numEndorsements: z.number().optional().describe('Number of votes/endorsements'),
      url: z.string().optional().describe('Idea URL'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      ideaId: z.string().describe('Idea ID'),
      referenceNum: z.string().describe('Idea reference number'),
      name: z.string().describe('Idea name'),
      status: z.string().optional().describe('Workflow status name'),
      numEndorsements: z.number().optional().describe('Number of votes/endorsements'),
      url: z.string().optional().describe('Idea URL'),
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
        let result = await client.listIdeas({
          updatedSince,
          perPage: 100
        });

        let inputs = result.ideas.map(i => ({
          ideaId: i.id,
          referenceNum: i.reference_num,
          name: i.name,
          status: i.workflow_status?.name,
          numEndorsements: i.num_endorsements,
          url: i.url,
          updatedAt: i.updated_at
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
        type: 'idea.updated',
        id: `idea-${ctx.input.ideaId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          ideaId: ctx.input.ideaId,
          referenceNum: ctx.input.referenceNum,
          name: ctx.input.name,
          status: ctx.input.status,
          numEndorsements: ctx.input.numEndorsements,
          url: ctx.input.url,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
