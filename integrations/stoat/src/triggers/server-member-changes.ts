import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let serverMemberChanges = SlateTrigger.create(spec, {
  name: 'Server Member Changes',
  key: 'server_member_changes',
  description:
    'Triggers when members join or leave a Revolt server. Polls the member list periodically to detect changes.'
})
  .input(
    z.object({
      eventType: z.enum(['joined', 'left']).describe('Whether the member joined or left'),
      serverId: z.string().describe('ID of the server'),
      userId: z.string().describe('User ID of the member'),
      nickname: z.string().optional().describe('Member nickname'),
      roles: z.array(z.string()).optional().describe('Role IDs of the member'),
      joinedAt: z.string().optional().describe('ISO 8601 timestamp when the member joined')
    })
  )
  .output(
    z.object({
      serverId: z.string().describe('ID of the server'),
      userId: z.string().describe('User ID of the member'),
      eventType: z.enum(['joined', 'left']).describe('Whether the member joined or left'),
      nickname: z.string().optional().describe('Member nickname'),
      roles: z.array(z.string()).optional().describe('Role IDs assigned to the member'),
      joinedAt: z.string().optional().describe('ISO 8601 timestamp when the member joined')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state ?? {};
      let serverId = state.serverId;

      if (!serverId) {
        return { inputs: [], updatedState: state };
      }

      try {
        let result = await client.fetchMembers(serverId);
        let membersArray = result.members ?? result;

        let currentMemberIds = new Set(membersArray.map((m: any) => m._id?.user ?? m.user));
        let previousMemberIds = new Set<string>(state.memberIds ?? []);

        let inputs: any[] = [];

        // First poll - just record state
        if (!state.memberIds) {
          return {
            inputs: [],
            updatedState: {
              serverId,
              memberIds: Array.from(currentMemberIds)
            }
          };
        }

        // Detect new members
        for (let member of membersArray) {
          let userId = member._id?.user ?? member.user;
          if (!previousMemberIds.has(userId)) {
            inputs.push({
              eventType: 'joined' as const,
              serverId,
              userId,
              nickname: (member.nickname ?? undefined) as string | undefined,
              roles: (member.roles ?? undefined) as string[] | undefined,
              joinedAt: (member.joined_at ?? undefined) as string | undefined
            });
          }
        }

        // Detect left members
        for (let userId of previousMemberIds) {
          if (!currentMemberIds.has(userId)) {
            inputs.push({
              eventType: 'left' as const,
              serverId,
              userId,
              nickname: undefined,
              roles: undefined,
              joinedAt: undefined
            });
          }
        }

        return {
          inputs,
          updatedState: {
            serverId,
            memberIds: Array.from(currentMemberIds)
          }
        };
      } catch {
        return { inputs: [], updatedState: state };
      }
    },

    handleEvent: async ctx => {
      return {
        type: `member.${ctx.input.eventType}`,
        id: `${ctx.input.serverId}-${ctx.input.userId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          serverId: ctx.input.serverId,
          userId: ctx.input.userId,
          eventType: ctx.input.eventType,
          nickname: ctx.input.nickname,
          roles: ctx.input.roles,
          joinedAt: ctx.input.joinedAt
        }
      };
    }
  })
  .build();
