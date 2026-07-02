import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let suppressionChanges = SlateTrigger.create(spec, {
  name: 'Suppression List Changes',
  key: 'suppression_changes',
  description:
    'Polls for new addresses added to the SES account-level suppression list. Detects bounces and complaints that caused addresses to be suppressed.'
})
  .input(
    z.object({
      emailAddress: z.string().describe('Suppressed email address'),
      reason: z.string().describe('Suppression reason (BOUNCE or COMPLAINT)'),
      lastUpdateTime: z.string().describe('When the address was suppressed')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().describe('Email address that was suppressed'),
      reason: z.string().describe('Suppression reason (BOUNCE or COMPLAINT)'),
      lastUpdateTime: z.string().describe('Timestamp of the suppression event')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SesClient({
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken,
        region: ctx.config.region
      });

      let lastPollTime = (ctx.state as any)?.lastPollTime || undefined;
      let now = new Date().toISOString();

      let result = await client.listSuppressedDestinations({
        startDate: lastPollTime,
        pageSize: 100
      });

      return {
        inputs: result.suppressedDestinations.map(s => ({
          emailAddress: s.emailAddress,
          reason: s.reason,
          lastUpdateTime: s.lastUpdateTime
        })),
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `suppression.${ctx.input.reason.toLowerCase()}`,
        id: `${ctx.input.emailAddress}-${ctx.input.lastUpdateTime}`,
        output: {
          emailAddress: ctx.input.emailAddress,
          reason: ctx.input.reason,
          lastUpdateTime: ctx.input.lastUpdateTime
        }
      };
    }
  })
  .build();
