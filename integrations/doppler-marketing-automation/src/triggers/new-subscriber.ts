import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSubscriber = SlateTrigger.create(spec, {
  name: 'New Subscriber',
  key: 'new_subscriber',
  description:
    'Triggers when a new subscriber is added to a specific list. Polls the list for recently added subscribers.'
})
  .input(
    z.object({
      email: z.string().describe('Subscriber email address'),
      status: z.string().describe('Subscriber status'),
      score: z.number().describe('Subscriber engagement score'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            value: z.string().describe('Field value')
          })
        )
        .describe('Custom field values'),
      listId: z.number().describe('ID of the list the subscriber was added to')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Subscriber email address'),
      status: z.string().describe('Subscriber status'),
      score: z.number().describe('Subscriber engagement score'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            value: z.string().describe('Field value')
          })
        )
        .describe('Custom field values'),
      listId: z.number().describe('ID of the list the subscriber belongs to')
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

      let state = ctx.state as {
        lastPollTime?: string;
        knownEmails?: string[];
        listId?: number;
      } | null;

      // We need a listId to poll - use the first available list if not in state
      let listId = state?.listId;
      if (!listId) {
        let lists = await client.getLists(1, 1);
        if (!lists.items || lists.items.length === 0) {
          return { inputs: [], updatedState: state ?? {} };
        }
        listId = lists.items[0]!.listId;
      }

      let now = new Date().toISOString();
      let fromDate = state?.lastPollTime;

      let result = await client.getListSubscribers(listId, {
        from: fromDate,
        page: 1,
        pageSize: 20
      });

      let knownEmails = new Set(state?.knownEmails ?? []);
      let newSubscribers = (result.items ?? []).filter(s => !knownEmails.has(s.email));

      let updatedKnownEmails = [...knownEmails, ...newSubscribers.map(s => s.email)];
      // Keep only last 1000 emails to prevent unbounded growth
      if (updatedKnownEmails.length > 1000) {
        updatedKnownEmails = updatedKnownEmails.slice(-1000);
      }

      return {
        inputs: newSubscribers.map(s => ({
          email: s.email,
          status: s.status,
          score: s.score,
          fields: s.fields ?? [],
          listId
        })),
        updatedState: {
          lastPollTime: now,
          knownEmails: updatedKnownEmails,
          listId
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'subscriber.added',
        id: `${ctx.input.listId}-${ctx.input.email}-${Date.now()}`,
        output: {
          email: ctx.input.email,
          status: ctx.input.status,
          score: ctx.input.score,
          fields: ctx.input.fields,
          listId: ctx.input.listId
        }
      };
    }
  })
  .build();
