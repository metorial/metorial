import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let statusUpdatesPolling = SlateTrigger.create(spec, {
  name: 'Status Updates (Polling)',
  key: 'status_updates_polling',
  description:
    '[Polling fallback] Polls for new status updates on suggestions. Detects when suggestion statuses change (e.g., moved to planned, completed). Useful for tracking feedback lifecycle changes.'
})
  .input(
    z.object({
      statusUpdateId: z.number().describe('ID of the status update'),
      body: z.string().nullable().describe('Status update message'),
      supportersNotified: z.boolean().describe('Whether supporters were notified'),
      createdAt: z.string().describe('When the status update was created'),
      updatedAt: z.string().describe('When the status update was last modified'),
      links: z
        .record(z.string(), z.any())
        .optional()
        .describe('Associated resource links (suggestion, user, new_status, old_status)')
    })
  )
  .output(
    z.object({
      statusUpdateId: z.number().describe('ID of the status update'),
      body: z.string().nullable().describe('Status update message'),
      supportersNotified: z.boolean().describe('Whether supporters were notified'),
      suggestionId: z.number().nullable().describe('ID of the affected suggestion'),
      newStatusId: z.number().nullable().describe('ID of the new status'),
      oldStatusId: z.number().nullable().describe('ID of the previous status'),
      userId: z.number().nullable().describe('ID of the user who made the update'),
      createdAt: z.string().describe('When the status update was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subdomain: ctx.auth.subdomain
      });

      let lastPoll = ctx.state?.lastPollTimestamp as string | undefined;

      let params: Record<string, unknown> = {
        sort: '-updated_at',
        perPage: 100
      };

      if (lastPoll) {
        params.updatedAfter = lastPoll;
      }

      let result = await client.listStatusUpdates(params);

      let now = new Date().toISOString();

      let inputs = result.statusUpdates.map((su: any) => ({
        statusUpdateId: su.id,
        body: su.body || null,
        supportersNotified: su.supporters_notified ?? false,
        createdAt: su.created_at,
        updatedAt: su.updated_at,
        links: su.links
      }));

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: now
        }
      };
    },

    handleEvent: async ctx => {
      let links = ctx.input.links || {};

      return {
        type: 'suggestion.status_changed',
        id: `status_update_${ctx.input.statusUpdateId}_${ctx.input.updatedAt}`,
        output: {
          statusUpdateId: ctx.input.statusUpdateId,
          body: ctx.input.body,
          supportersNotified: ctx.input.supportersNotified,
          suggestionId: (links.suggestion as number) ?? null,
          newStatusId: (links.new_status as number) ?? null,
          oldStatusId: (links.old_status as number) ?? null,
          userId: (links.user as number) ?? null,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
