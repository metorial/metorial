import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let rewardEventNames = ['RewardAdd', 'RewardUpdate', 'RewardDelete', 'RewardIssue'] as const;

export let rewardEvents = SlateTrigger.create(spec, {
  name: 'Reward Events',
  key: 'reward_events',
  description:
    'Triggered when a reward is added, updated, deleted, or issued. Covers the full reward lifecycle including payout events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of reward event'),
      eventId: z.string().describe('Unique event identifier'),
      reward: z.record(z.string(), z.unknown()).describe('Reward data from webhook payload')
    })
  )
  .output(
    z.object({
      rewardId: z.string().describe('Reward ID'),
      programId: z.string().optional().describe('Program ID'),
      programName: z.string().optional().describe('Program name'),
      memberId: z.string().optional().describe('Associated member ID'),
      referralId: z.string().optional().describe('Associated referral ID'),
      type: z.string().optional().describe('Reward type (Member or Referral)'),
      recipientId: z.string().optional().describe('Recipient ID'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmailAddress: z.string().optional().describe('Recipient email'),
      status: z.string().optional().describe('Reward status'),
      amount: z.number().optional().describe('Reward amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      description: z.string().optional().describe('Reward description'),
      createDate: z.string().optional().describe('Earned date'),
      issueDate: z.string().optional().describe('Issued date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ReferralRockClient({ token: ctx.auth.token });
      let webhookIds: Record<string, string> = {};

      for (let event of rewardEventNames) {
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
      let reward = (data.data || data.Data || data) as Record<string, unknown>;

      let eventId = `${eventType}-${reward.id || reward.Id || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            reward
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.reward;

      let eventTypeMap: Record<string, string> = {
        RewardAdd: 'reward.added',
        RewardUpdate: 'reward.updated',
        RewardDelete: 'reward.deleted',
        RewardIssue: 'reward.issued'
      };

      return {
        type:
          eventTypeMap[ctx.input.eventType] || `reward.${ctx.input.eventType.toLowerCase()}`,
        id: ctx.input.eventId,
        output: {
          rewardId: (r.id || r.Id || '') as string,
          programId: (r.programId || r.ProgramId) as string | undefined,
          programName: (r.programName || r.ProgramName) as string | undefined,
          memberId: (r.memberId || r.MemberId) as string | undefined,
          referralId: (r.referralId || r.ReferralId) as string | undefined,
          type: (r.type || r.Type) as string | undefined,
          recipientId: (r.recipientId || r.RecipientId) as string | undefined,
          recipientName: (r.recipientName || r.RecipientName) as string | undefined,
          recipientEmailAddress: (r.recipientEmailAddress || r.RecipientEmailAddress) as
            | string
            | undefined,
          status: (r.status || r.Status) as string | undefined,
          amount: (r.amount || r.Amount) as number | undefined,
          currencyCode: (r.currencyCode || r.CurrencyCode) as string | undefined,
          description: (r.description || r.Description) as string | undefined,
          createDate: (r.createDate || r.CreateDate) as string | undefined,
          issueDate: (r.issueDate || r.IssueDate) as string | undefined
        }
      };
    }
  })
  .build();
