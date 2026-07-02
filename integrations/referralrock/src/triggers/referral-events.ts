import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let referralEventNames = [
  'ReferralAdd',
  'ReferralUpdate',
  'ReferralStatusChange',
  'ReferralDelete'
] as const;

export let referralEvents = SlateTrigger.create(spec, {
  name: 'Referral Events',
  key: 'referral_events',
  description:
    'Triggered when a referral is added, updated, deleted, or when its status changes. Covers the full referral lifecycle.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of referral event'),
      eventId: z.string().describe('Unique event identifier'),
      referral: z
        .record(z.string(), z.unknown())
        .describe('Referral data from webhook payload')
    })
  )
  .output(
    z.object({
      referralId: z.string().describe('Referral ID'),
      displayName: z.string().optional().describe('Display name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      externalIdentifier: z.string().optional().describe('External system ID'),
      amount: z.number().optional().describe('Referral amount'),
      status: z.string().optional().describe('Referral status'),
      programId: z.string().optional().describe('Program ID'),
      programTitle: z.string().optional().describe('Program title'),
      referringMemberId: z.string().optional().describe('Referring member ID'),
      referringMemberName: z.string().optional().describe('Referring member name'),
      memberReferralCode: z.string().optional().describe('Referring member referral code'),
      companyName: z.string().optional().describe('Company name'),
      createDate: z.string().optional().describe('Creation date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds: Record<string, string> = {};

      for (let event of referralEventNames) {
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
      let referral = (data.data || data.Data || data) as Record<string, unknown>;

      let eventId = `${eventType}-${referral.id || referral.Id || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            referral
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.referral;

      let eventTypeMap: Record<string, string> = {
        ReferralAdd: 'referral.added',
        ReferralUpdate: 'referral.updated',
        ReferralStatusChange: 'referral.status_changed',
        ReferralDelete: 'referral.deleted'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `referral.${ctx.input.eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          referralId: (r.id || r.Id || '') as string,
          displayName: (r.displayName || r.DisplayName) as string | undefined,
          firstName: (r.firstName || r.FirstName) as string | undefined,
          lastName: (r.lastName || r.LastName) as string | undefined,
          email: (r.email || r.Email) as string | undefined,
          externalIdentifier: (r.externalIdentifier || r.ExternalIdentifier) as
            | string
            | undefined,
          amount: (r.amount || r.Amount) as number | undefined,
          status: (r.status || r.Status) as string | undefined,
          programId: (r.programId || r.ProgramId) as string | undefined,
          programTitle: (r.programTitle || r.ProgramTitle) as string | undefined,
          referringMemberId: (r.referringMemberId || r.ReferringMemberId) as
            | string
            | undefined,
          referringMemberName: (r.referringMemberName || r.ReferringMemberName) as
            | string
            | undefined,
          memberReferralCode: (r.memberReferralCode || r.MemberReferralCode) as
            | string
            | undefined,
          companyName: (r.companyName || r.CompanyName) as string | undefined,
          createDate: (r.createDate || r.CreateDate) as string | undefined
        }
      };
    }
  })
  .build();
