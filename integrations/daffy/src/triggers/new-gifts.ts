import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newGifts = SlateTrigger.create(spec, {
  name: 'New Gifts',
  key: 'new_gifts',
  description: 'Triggers when new Daffy Gifts are created or their status changes.'
})
  .input(
    z.object({
      code: z.string().describe('Unique gift code (UUID)'),
      name: z.string().describe('Recipient name'),
      amount: z.number().describe('Gift amount in USD'),
      message: z.string().nullable().describe('Gift message'),
      ein: z.string().nullable().describe('Non-profit EIN if claimed'),
      status: z.string().describe('Gift status'),
      seen: z.boolean().describe('Whether the gift has been viewed'),
      claimed: z.boolean().describe('Whether the gift has been claimed'),
      url: z.string().describe('Shareable URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      code: z.string().describe('Unique gift code (UUID)'),
      name: z.string().describe('Recipient name'),
      amount: z.number().describe('Gift amount in USD'),
      message: z.string().nullable().describe('Gift message'),
      ein: z.string().nullable().describe('Non-profit EIN if claimed'),
      status: z.string().describe('Gift status (new, accepted, denied, claimed)'),
      seen: z.boolean().describe('Whether the gift has been viewed'),
      claimed: z.boolean().describe('Whether the gift has been claimed'),
      url: z.string().describe('Shareable URL for the recipient to claim the gift'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.getGifts(1);

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;
      let newGifts = lastSeenTimestamp
        ? result.items.filter(g => g.created_at > lastSeenTimestamp)
        : result.items;

      let latestTimestamp =
        result.items.length > 0
          ? result.items.reduce(
              (latest, g) => (g.created_at > latest ? g.created_at : latest),
              lastSeenTimestamp || ''
            )
          : lastSeenTimestamp;

      return {
        inputs: newGifts.map(g => ({
          code: g.code,
          name: g.name,
          amount: g.amount,
          message: g.message,
          ein: g.ein,
          status: g.status,
          seen: g.seen,
          claimed: g.claimed,
          url: g.url,
          createdAt: g.created_at,
          updatedAt: g.updated_at
        })),
        updatedState: {
          lastSeenTimestamp: latestTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'gift.created',
        id: ctx.input.code,
        output: {
          code: ctx.input.code,
          name: ctx.input.name,
          amount: ctx.input.amount,
          message: ctx.input.message,
          ein: ctx.input.ein,
          status: ctx.input.status,
          seen: ctx.input.seen,
          claimed: ctx.input.claimed,
          url: ctx.input.url,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
