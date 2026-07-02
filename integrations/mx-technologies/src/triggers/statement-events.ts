import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let statementEvents = SlateTrigger.create(spec, {
  name: 'Statement Events',
  key: 'statement_events',
  description: 'Triggered when statement retrieval completes for a member.'
})
  .input(
    z.object({
      action: z.string().describe('Event action'),
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      connectionStatus: z
        .string()
        .optional()
        .nullable()
        .describe('Connection status after statement fetch'),
      isBeingAggregated: z.boolean().optional().describe('Whether aggregation is in progress')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'statements',
            userGuid: data.user_guid || data.member?.user_guid || '',
            memberGuid: data.member_guid || data.member?.guid || '',
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let member = ctx.input.payload?.member || {};

      return {
        type: `member.statements`,
        id: `${ctx.input.memberGuid}-statements-${Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          memberGuid: ctx.input.memberGuid,
          connectionStatus: member.connection_status,
          isBeingAggregated: member.is_being_aggregated
        }
      };
    }
  })
  .build();
