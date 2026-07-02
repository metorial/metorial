import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let connectionStatusEvents = SlateTrigger.create(spec, {
  name: 'Connection Status Events',
  key: 'connection_status_events',
  description:
    'Triggered when the connection status of a member changes (e.g., connected, disconnected, challenged, denied, failed).'
})
  .input(
    z.object({
      action: z.string().describe('Webhook action type'),
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      connectionStatus: z.string().optional().nullable().describe('New connection status'),
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
        .describe('New connection status (CONNECTED, CHALLENGED, DENIED, FAILED, etc.)'),
      institutionCode: z.string().optional().nullable().describe('Institution code'),
      isBeingAggregated: z.boolean().optional().describe('Whether aggregation is in progress')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            action: data.action || 'connection_status',
            userGuid: data.user_guid || data.member?.user_guid || '',
            memberGuid: data.member_guid || data.member?.guid || '',
            connectionStatus: data.member?.connection_status || data.connection_status,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let member = ctx.input.payload?.member || {};

      return {
        type: `member.connection_status`,
        id: `${ctx.input.memberGuid}-connection-${ctx.input.connectionStatus}-${Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          memberGuid: ctx.input.memberGuid,
          connectionStatus: ctx.input.connectionStatus || member.connection_status,
          institutionCode: member.institution_code,
          isBeingAggregated: member.is_being_aggregated
        }
      };
    }
  })
  .build();
