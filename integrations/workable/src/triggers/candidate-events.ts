import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let candidateEventsTrigger = SlateTrigger.create(spec, {
  name: 'Candidate Events',
  key: 'candidate_events',
  description:
    'Triggered when a candidate is created or moves to a different pipeline stage. Delivers the full candidate object at the time of the event.'
})
  .input(
    z.object({
      eventType: z
        .enum(['candidate_created', 'candidate_moved'])
        .describe('Type of candidate event'),
      candidate: z.any().describe('Full candidate payload from the webhook'),
      jobShortcode: z.string().optional().describe('Job shortcode'),
      stage: z.string().optional().describe('Stage the candidate is in or moved to')
    })
  )
  .output(
    z.object({
      candidateId: z.string().describe('Candidate ID'),
      name: z.string().describe('Candidate full name'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      headline: z.string().optional().describe('Candidate headline'),
      stage: z.string().optional().describe('Current pipeline stage'),
      jobShortcode: z.string().optional().describe('Job shortcode'),
      jobTitle: z.string().optional().describe('Job title'),
      disqualified: z.boolean().optional().describe('Whether the candidate is disqualified'),
      profileUrl: z.string().optional().describe('Workable profile URL'),
      tags: z.array(z.string()).optional().describe('Candidate tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let subscriptionIds: string[] = [];
      let events = ['candidate_created', 'candidate_moved'];

      for (let event of events) {
        let result = await client.createSubscription({
          target: ctx.input.webhookBaseUrl,
          event
        });
        if (result.id) {
          subscriptionIds.push(result.id);
        }
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let ids = ctx.input.registrationDetails?.subscriptionIds || [];
      for (let subId of ids) {
        try {
          await client.deleteSubscription(subId);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type;
      let candidate = data.data || data.candidate || data;

      return {
        inputs: [
          {
            eventType,
            candidate,
            jobShortcode: candidate.job?.shortcode || data.job_shortcode,
            stage: candidate.stage
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.candidate;

      return {
        type: `candidate.${ctx.input.eventType === 'candidate_created' ? 'created' : 'moved'}`,
        id: `${c.id || c.candidate_id}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          candidateId: c.id || c.candidate_id,
          name: c.name,
          firstname: c.firstname,
          lastname: c.lastname,
          email: c.email,
          headline: c.headline,
          stage: c.stage || ctx.input.stage,
          jobShortcode: c.job?.shortcode || ctx.input.jobShortcode,
          jobTitle: c.job?.title,
          disqualified: c.disqualified,
          profileUrl: c.profile_url,
          tags: c.tags,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }
      };
    }
  })
  .build();
