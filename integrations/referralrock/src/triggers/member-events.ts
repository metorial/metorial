import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let memberEventNames = ['MemberAdd', 'MemberUpdate', 'MemberDelete'] as const;

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description:
    'Triggered when a member (advocate) is added, updated, or deleted from a referral program.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of member event'),
      eventId: z.string().describe('Unique event identifier'),
      member: z.record(z.string(), z.unknown()).describe('Member data from webhook payload')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('Member ID'),
      displayName: z.string().optional().describe('Display name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      externalIdentifier: z.string().optional().describe('External system ID'),
      programId: z.string().optional().describe('Program ID'),
      programTitle: z.string().optional().describe('Program title'),
      referralCode: z.string().optional().describe('Referral code'),
      referralUrl: z.string().optional().describe('Referral URL'),
      status: z.string().optional().describe('Member status'),
      referrals: z.number().optional().describe('Total referral count'),
      rewardAmountTotal: z.number().optional().describe('Total reward amount')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds: Record<string, string> = {};

      for (let event of memberEventNames) {
        let result = await client.registerWebhook(ctx.input.webhookBaseUrl, event);
        webhookIds[event] = result.web_hook_id;
      }

      return { registrationDetails: webhookIds };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds = ctx.input.registrationDetails as Record<string, string>;

      for (let id of Object.values(webhookIds)) {
        try {
          await client.unregisterWebhook(id);
        } catch {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.Event || '') as string;
      let member = (data.data || data.Data || data) as Record<string, unknown>;

      let eventId = `${eventType}-${member.id || member.Id || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            member
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let m = ctx.input.member;

      let eventTypeMap: Record<string, string> = {
        MemberAdd: 'member.added',
        MemberUpdate: 'member.updated',
        MemberDelete: 'member.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `member.${ctx.input.eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          memberId: (m.id || m.Id || '') as string,
          displayName: (m.displayName || m.DisplayName) as string | undefined,
          firstName: (m.firstName || m.FirstName) as string | undefined,
          lastName: (m.lastName || m.LastName) as string | undefined,
          email: (m.email || m.Email) as string | undefined,
          externalIdentifier: (m.externalIdentifier || m.ExternalIdentifier) as
            | string
            | undefined,
          programId: (m.programId || m.ProgramId) as string | undefined,
          programTitle: (m.programTitle || m.ProgramTitle) as string | undefined,
          referralCode: (m.referralCode || m.ReferralCode) as string | undefined,
          referralUrl: (m.referralUrl || m.ReferralUrl) as string | undefined,
          status: (m.status || m.Status) as string | undefined,
          referrals: (m.referrals || m.Referrals) as number | undefined,
          rewardAmountTotal: (m.rewardAmountTotal || m.RewardAmountTotal) as number | undefined
        }
      };
    }
  })
  .build();
