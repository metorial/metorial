import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers on Zoom user lifecycle events: created, activated, deactivated, updated, deleted, and disassociated.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The specific event type (e.g., user.created, user.updated)'),
      eventTimestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      accountId: z.string().optional().describe('Zoom account ID'),
      user: z.any().describe('User object from the webhook payload')
    })
  )
  .output(
    z.object({
      odataUserId: z.string().optional().describe('User ID'),
      email: z.string().optional().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      displayName: z.string().optional().describe('Display name'),
      type: z.number().optional().describe('User type'),
      department: z.string().optional().describe('Department')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'endpoint.url_validation') {
        return {
          inputs: [],
          response: new Response(
            JSON.stringify({
              plainToken: body.payload?.plainToken,
              encryptedToken: body.payload?.plainToken
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      let eventType = body.event as string;

      if (!eventType?.startsWith('user.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.event_ts,
            accountId: body.payload?.account_id,
            user: body.payload?.object || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user as any;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${user?.id || user?.email}-${ctx.input.eventTimestamp || Date.now()}`,
        output: {
          odataUserId: user?.id as string | undefined,
          email: user?.email as string | undefined,
          firstName: user?.first_name as string | undefined,
          lastName: user?.last_name as string | undefined,
          displayName: user?.display_name as string | undefined,
          type: user?.type as number | undefined,
          department: user?.department as string | undefined
        }
      };
    }
  })
  .build();
