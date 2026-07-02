import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let aggregationEvents = SlateTrigger.create(spec, {
  name: 'Aggregation Events',
  key: 'aggregation_events',
  description:
    'Triggered when aggregation, balance check, verification, identification, or extended history jobs complete for a member.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe(
          'The webhook action (e.g., aggregation, balance, verification, history, identify)'
        ),
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      connectionStatus: z.string().optional().nullable().describe('Current connection status'),
      isBeingAggregated: z.boolean().optional().describe('Whether aggregation is in progress'),
      successfullyAggregatedAt: z
        .string()
        .optional()
        .nullable()
        .describe('Timestamp of last successful aggregation'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      connectionStatus: z.string().optional().nullable().describe('Current connection status'),
      isBeingAggregated: z.boolean().optional().describe('Whether aggregation is in progress'),
      successfullyAggregatedAt: z
        .string()
        .optional()
        .nullable()
        .describe('Timestamp of last successful aggregation'),
      institutionCode: z.string().optional().nullable().describe('Institution code'),
      aggregatedAt: z.string().optional().nullable().describe('Aggregation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let action = data.action || 'aggregation';

      return {
        inputs: [
          {
            action,
            userGuid: data.user_guid || data.member?.user_guid || '',
            memberGuid: data.member_guid || data.member?.guid || '',
            connectionStatus: data.member?.connection_status || data.connection_status,
            isBeingAggregated: data.member?.is_being_aggregated,
            successfullyAggregatedAt: data.member?.successfully_aggregated_at,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let member = ctx.input.payload?.member || {};

      return {
        type: `member.${ctx.input.action}`,
        id: `${ctx.input.memberGuid}-${ctx.input.action}-${ctx.input.successfullyAggregatedAt || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          memberGuid: ctx.input.memberGuid,
          connectionStatus: ctx.input.connectionStatus || member.connection_status,
          isBeingAggregated: ctx.input.isBeingAggregated ?? member.is_being_aggregated,
          successfullyAggregatedAt:
            ctx.input.successfullyAggregatedAt || member.successfully_aggregated_at,
          institutionCode: member.institution_code,
          aggregatedAt: member.aggregated_at
        }
      };
    }
  })
  .build();
