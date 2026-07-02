import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newMemberTrigger = SlateTrigger.create(spec, {
  name: 'New Member',
  key: 'new_member',
  description: 'Triggers when a new member (user) is added to the organization in 21RISK.'
})
  .input(
    z.object({
      memberId: z.string().describe('Unique identifier of the member'),
      member: z.record(z.string(), z.any()).describe('Full member record from the API')
    })
  )
  .output(
    z
      .object({
        memberId: z.string().describe('Unique identifier of the member'),
        name: z.string().optional().describe('Full name of the member'),
        email: z.string().optional().describe('Email address of the member'),
        role: z.string().optional().describe('Role within the organization'),
        createdDate: z.string().optional().describe('Date the member was added')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let filterExpr = lastPolledAt ? `CreatedDate gt ${lastPolledAt}` : undefined;

      let members = await client.getMembers({
        filter: filterExpr,
        orderby: 'CreatedDate desc',
        top: 50
      });

      let results = Array.isArray(members) ? members : [];

      let newLastPolledAt = lastPolledAt;
      if (results.length > 0) {
        let latestDate = results[0].CreatedDate ?? results[0].createdDate;
        if (latestDate) {
          newLastPolledAt = latestDate;
        }
      }

      return {
        inputs: results.map((member: any) => ({
          memberId: String(member.Id ?? member.id ?? member.MemberId ?? member.memberId ?? ''),
          member
        })),
        updatedState: {
          lastPolledAt: newLastPolledAt ?? new Date().toISOString()
        }
      };
    },
    handleEvent: async ctx => {
      let member = ctx.input.member as Record<string, any>;

      return {
        type: 'member.created',
        id: ctx.input.memberId,
        output: {
          memberId: ctx.input.memberId,
          name: String(member.Name ?? member.name ?? member.FullName ?? member.fullName ?? ''),
          email: String(member.Email ?? member.email ?? ''),
          role: String(member.Role ?? member.role ?? ''),
          createdDate: String(member.CreatedDate ?? member.createdDate ?? ''),
          ...member
        }
      };
    }
  })
  .build();
