import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let memberChanges = SlateTrigger.create(spec, {
  name: 'New Member',
  key: 'new_member',
  description: `[Polling fallback] Polls for newly created members in the directory. Detects new member signups by checking for members created since the last poll.`
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the new member.'),
      memberData: z.record(z.string(), z.any()).describe('Full member data.')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID of the member.'),
      email: z.string().optional().describe('Email of the member.'),
      firstName: z.string().optional().describe('First name of the member.'),
      lastName: z.string().optional().describe('Last name of the member.'),
      memberData: z.record(z.string(), z.any()).describe('Full member profile data.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        websiteDomain: ctx.config.websiteDomain
      });

      let lastCheckedId = ctx.state?.lastCheckedId || '0';

      let result = await client.searchUsers({
        output_type: 'array',
        limit: 100
      });

      let members: any[] = [];
      if (result.status === 'success' && Array.isArray(result.message)) {
        members = result.message;
      } else if (
        result.status === 'success' &&
        result.message?.results &&
        Array.isArray(result.message.results)
      ) {
        members = result.message.results;
      }

      let newMembers = members.filter((m: any) => {
        let memberId = String(m.user_id || m.id || '0');
        return Number.parseInt(memberId, 10) > Number.parseInt(lastCheckedId, 10);
      });

      let highestId = lastCheckedId;
      for (let m of newMembers) {
        let mId = String(m.user_id || m.id || '0');
        if (Number.parseInt(mId, 10) > Number.parseInt(highestId, 10)) {
          highestId = mId;
        }
      }

      return {
        inputs: newMembers.map((m: any) => ({
          userId: String(m.user_id || m.id),
          memberData: m
        })),
        updatedState: {
          lastCheckedId: highestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'member.created',
        id: ctx.input.userId,
        output: {
          userId: ctx.input.userId,
          email: ctx.input.memberData.email || undefined,
          firstName: ctx.input.memberData.first_name || undefined,
          lastName: ctx.input.memberData.last_name || undefined,
          memberData: ctx.input.memberData
        }
      };
    }
  })
  .build();
