import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import { spec } from '../spec';

export let openingEventsTrigger = SlateTrigger.create(spec, {
  name: 'Opening Events',
  key: 'opening_events',
  description: 'Triggers when an opening (headcount) is created.'
})
  .input(
    z.object({
      webhookType: z.string().describe('The type of webhook event'),
      webhookActionId: z
        .string()
        .describe('Unique ID grouping related webhook events from the same action'),
      openingId: z.string().describe('The opening ID'),
      rawPayload: z.any().describe('The full webhook payload')
    })
  )
  .output(
    z.object({
      openingId: z.string().describe('The opening ID'),
      jobId: z.string().optional().describe('The associated job ID'),
      jobTitle: z.string().optional().describe('The associated job title'),
      state: z.string().optional().describe('The opening state')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let secretToken = crypto.randomUUID();

      let response = await client.createWebhook({
        webhookType: 'openingCreate',
        requestUrl: ctx.input.webhookBaseUrl,
        secretToken
      });

      return {
        registrationDetails: {
          webhookId: response.results.id,
          secretToken
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AshbyClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let openingId = data.data?.opening?.id || data.data?.openingId || '';

      return {
        inputs: [
          {
            webhookType: data.action || 'openingCreate',
            webhookActionId: data.webhookActionId || crypto.randomUUID(),
            openingId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let openingData = payload.data?.opening || {};

      let jobId = openingData.job?.id || openingData.jobId;
      let jobTitle = openingData.job?.title;
      let state = openingData.state;

      if (jobId && !jobTitle) {
        try {
          let client = new AshbyClient({ token: ctx.auth.token });
          let jobInfo = await client.getJob(jobId);
          jobTitle = jobInfo.results?.title;
        } catch {
          // Use data from the webhook payload
        }
      }

      return {
        type: 'opening.created',
        id: ctx.input.webhookActionId,
        output: {
          openingId: ctx.input.openingId,
          jobId,
          jobTitle,
          state
        }
      };
    }
  })
  .build();
