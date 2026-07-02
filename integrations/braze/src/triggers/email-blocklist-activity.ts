import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let emailBlocklistActivity = SlateTrigger.create(spec, {
  name: 'Email Blocklist Activity',
  key: 'email_blocklist_activity',
  description:
    'Detects new hard bounced or unsubscribed email addresses by polling the Braze email management endpoints.'
})
  .input(
    z.object({
      eventType: z.enum(['hard_bounce', 'unsubscribe']).describe('Type of blocklist event'),
      email: z.string().describe('Affected email address'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Affected email address'),
      eventType: z.string().describe('Type of blocklist event (hard_bounce or unsubscribe)'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BrazeClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      let now = new Date().toISOString();
      let startDate = lastPolled
        ? lastPolled.split('T')[0]
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let inputs: {
        eventType: 'hard_bounce' | 'unsubscribe';
        email: string;
        occurredAt?: string;
      }[] = [];

      try {
        let bounces = await client.listHardBounces({
          startDate,
          limit: 500
        });
        let knownBounces = (ctx.state?.knownBounces as string[] | undefined) ?? [];

        for (let entry of bounces.emails ?? []) {
          let email = typeof entry === 'string' ? entry : entry.email;
          let bouncedAt = typeof entry === 'object' ? entry.hard_bounced_at : undefined;
          if (!knownBounces.includes(email)) {
            inputs.push({
              eventType: 'hard_bounce',
              email,
              occurredAt: bouncedAt
            });
          }
        }
      } catch (_e) {
        // Endpoint may not be available with current API key permissions
      }

      try {
        let unsubs = await client.listUnsubscribes({
          startDate,
          limit: 500
        });
        let knownUnsubs = (ctx.state?.knownUnsubs as string[] | undefined) ?? [];

        for (let entry of unsubs.emails ?? []) {
          let email = typeof entry === 'string' ? entry : entry.email;
          let unsubAt = typeof entry === 'object' ? entry.unsubscribed_at : undefined;
          if (!knownUnsubs.includes(email)) {
            inputs.push({
              eventType: 'unsubscribe',
              email,
              occurredAt: unsubAt
            });
          }
        }
      } catch (_e) {
        // Endpoint may not be available with current API key permissions
      }

      let allBounceEmails = inputs
        .filter(i => i.eventType === 'hard_bounce')
        .map(i => i.email);
      let allUnsubEmails = inputs.filter(i => i.eventType === 'unsubscribe').map(i => i.email);

      return {
        inputs,
        updatedState: {
          lastPolled: now,
          knownBounces: [
            ...new Set([
              ...((ctx.state?.knownBounces as string[] | undefined) ?? []),
              ...allBounceEmails
            ])
          ].slice(-1000),
          knownUnsubs: [
            ...new Set([
              ...((ctx.state?.knownUnsubs as string[] | undefined) ?? []),
              ...allUnsubEmails
            ])
          ].slice(-1000)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `email.${ctx.input.eventType}`,
        id: `email-${ctx.input.eventType}-${ctx.input.email}-${ctx.input.occurredAt ?? Date.now()}`,
        output: {
          email: ctx.input.email,
          eventType: ctx.input.eventType,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
