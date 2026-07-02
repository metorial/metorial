import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newUnsubscribe = SlateTrigger.create(spec, {
  name: 'New Unsubscribe',
  key: 'new_unsubscribe',
  description:
    'Triggers when a contact is unsubscribed or removed from the account. Polls for recently unsubscribed contacts.'
})
  .input(
    z.object({
      email: z.string().describe('Contact email address'),
      unsubscriptionDate: z.string().describe('Date of unsubscription'),
      unsubscriptionType: z.string().describe('Type/reason of unsubscription')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Contact email address'),
      unsubscriptionDate: z.string().describe('Date of unsubscription'),
      unsubscriptionType: z
        .string()
        .describe(
          'Type/reason of unsubscription (e.g. hardBounce, softBounce, manual, abuseLink, feedbackLoop)'
        )
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountEmail: ctx.config.accountEmail
      });

      let state = ctx.state as { lastPollTime?: string; knownEmails?: string[] } | null;
      let now = new Date().toISOString();
      let fromDate = state?.lastPollTime;

      let result = await client.getUnsubscribed({
        from: fromDate,
        page: 1,
        pageSize: 20
      });

      let knownEmails = new Set(state?.knownEmails ?? []);
      let newUnsubscribes = (result.items ?? []).filter(c => !knownEmails.has(c.email));

      let updatedKnownEmails = [...knownEmails, ...newUnsubscribes.map(c => c.email)];
      if (updatedKnownEmails.length > 1000) {
        updatedKnownEmails = updatedKnownEmails.slice(-1000);
      }

      return {
        inputs: newUnsubscribes.map(c => ({
          email: c.email,
          unsubscriptionDate: c.unsubscriptionDate,
          unsubscriptionType: c.unsubscriptionType
        })),
        updatedState: {
          lastPollTime: now,
          knownEmails: updatedKnownEmails
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'subscriber.unsubscribed',
        id: `${ctx.input.email}-${ctx.input.unsubscriptionDate}`,
        output: {
          email: ctx.input.email,
          unsubscriptionDate: ctx.input.unsubscriptionDate,
          unsubscriptionType: ctx.input.unsubscriptionType
        }
      };
    }
  })
  .build();
