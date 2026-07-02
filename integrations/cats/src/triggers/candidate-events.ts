import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let CANDIDATE_EVENTS = [
  'candidate.created',
  'candidate.updated',
  'candidate.deleted'
] as const;

export let candidateEvents = SlateTrigger.create(spec, {
  name: 'Candidate Events',
  key: 'candidate_events',
  description: 'Triggers when a candidate is created, updated, or deleted in CATS.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (e.g. candidate.created)'),
      candidateId: z.string().describe('Candidate ID'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Title'),
      currentEmployer: z.string().optional().describe('Current employer'),
      isActive: z.boolean().optional().describe('Whether active'),
      isHot: z.boolean().optional().describe('Whether hot'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];
      for (let event of CANDIDATE_EVENTS) {
        let result = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        let webhookId =
          result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';
        webhookIds.push(webhookId);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details?.webhookIds ?? []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let candidateId = data.candidate_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            candidateId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let candidate: any = {};
      if (ctx.input.eventType !== 'candidate.deleted') {
        try {
          candidate = await client.getCandidate(ctx.input.candidateId);
        } catch {
          // Candidate may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.candidateId}-${Date.now()}`,
        output: {
          candidateId: ctx.input.candidateId,
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          title: candidate.title,
          currentEmployer: candidate.current_employer,
          isActive: candidate.is_active,
          isHot: candidate.is_hot,
          createdAt: candidate.created_at,
          updatedAt: candidate.updated_at
        }
      };
    }
  })
  .build();
