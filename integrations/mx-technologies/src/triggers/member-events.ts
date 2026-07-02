import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description: 'Triggered when a member is created, updated, or deleted.'
})
  .input(
    z.object({
      action: z.string().describe('Event action (created, updated, deleted)'),
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      payload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      userGuid: z.string().describe('GUID of the user'),
      memberGuid: z.string().describe('GUID of the member'),
      institutionCode: z.string().optional().nullable().describe('Institution code'),
      connectionStatus: z.string().optional().nullable().describe('Connection status'),
      name: z.string().optional().nullable().describe('Member name'),
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
        type: `member.${ctx.input.action}`,
        id: `${ctx.input.memberGuid}-${ctx.input.action}-${member.version || Date.now()}`,
        output: {
          userGuid: ctx.input.userGuid,
          memberGuid: ctx.input.memberGuid,
          institutionCode: member.institution_code,
          connectionStatus: member.connection_status,
          name: member.name,
          version: member.version
        }
      };
    }
  })
  .build();
