import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description: 'Triggered when a user is created or updated.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, updated)'),
      userGuid: z.string().describe('GUID of the user'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      userId: z.string().optional().nullable().describe('Partner-defined user ID'),
      isDisabled: z.boolean().optional().describe('Whether the user is disabled'),
      metadata: z.string().optional().nullable().describe('User metadata'),
      version: z.number().optional().nullable().describe('Object version for change detection')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let action = data.action || 'updated';

      return {
        inputs: [
          {
            action,
            userGuid: data.user_guid || data.user?.guid || '',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.payload?.user || {};

      return {
        type: `user.${ctx.input.action}`,
        id: `${ctx.input.userGuid}-${ctx.input.action}-${user.version || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          userId: user.id,
          isDisabled: user.is_disabled,
          metadata: user.metadata,
          version: user.version
        }
      };
    }
  })
  .build();
