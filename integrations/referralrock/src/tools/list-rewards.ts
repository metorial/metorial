import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let rewardSchema = z.object({
  rewardId: z.string().describe('Unique reward ID'),
  programId: z.string().optional().describe('Program ID'),
  programName: z.string().optional().describe('Program name'),
  memberId: z.string().optional().describe('Associated member ID'),
  referralId: z.string().optional().describe('Associated referral ID'),
  type: z.string().optional().describe('Reward type (Member or Referral)'),
  recipientId: z.string().optional().describe('Reward recipient ID'),
  recipientName: z.string().optional().describe('Recipient name'),
  recipientEmailAddress: z.string().optional().describe('Recipient email'),
  status: z.string().optional().describe('Reward status (Pending, Processing, Issued)'),
  amount: z.number().optional().describe('Monetary value'),
  currencyCode: z.string().optional().describe('Currency code'),
  description: z.string().optional().describe('Reward description'),
  createDate: z.string().optional().describe('Earned date'),
  issueDate: z.string().optional().describe('Issued date'),
  eligibilityDate: z.string().optional().describe('Eligibility date'),
  source: z.string().optional().describe('Source (Referral Action, Status Based, Manual)'),
  payoutDescription: z.string().optional().describe('Payout description'),
  paymentType: z.string().optional().describe('Payment type')
});

export let listRewards = SlateTool.create(spec, {
  name: 'List Rewards',
  key: 'list_rewards',
  description: `List rewards across programs, members, or referrals. Filter by program, member, or referral to see earned, pending, and issued rewards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID'),
      memberId: z.string().optional().describe('Filter by member ID'),
      referralId: z.string().optional().describe('Filter by referral ID'),
      offset: z.number().optional().describe('Starting index for pagination (0-based)'),
      count: z.number().optional().describe('Maximum number of rewards to return')
    })
  )
  .output(
    z.object({
      rewards: z.array(rewardSchema).describe('List of rewards'),
      total: z.number().optional().describe('Total number of rewards matching filters'),
      offset: z.number().optional().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.listRewards({
      programId: ctx.input.programId,
      memberId: ctx.input.memberId,
      referralId: ctx.input.referralId,
      offset: ctx.input.offset,
      count: ctx.input.count
    });

    let rewards = ((result.rewards as Record<string, unknown>[]) || []).map(r => ({
      rewardId: r.id as string,
      programId: r.programId as string | undefined,
      programName: r.programName as string | undefined,
      memberId: r.memberId as string | undefined,
      referralId: r.referralId as string | undefined,
      type: r.type as string | undefined,
      recipientId: r.recipientId as string | undefined,
      recipientName: r.recipientName as string | undefined,
      recipientEmailAddress: r.recipientEmailAddress as string | undefined,
      status: r.status as string | undefined,
      amount: r.amount as number | undefined,
      currencyCode: r.currencyCode as string | undefined,
      description: r.description as string | undefined,
      createDate: r.createDate as string | undefined,
      issueDate: r.issueDate as string | undefined,
      eligibilityDate: r.eligibilityDate as string | undefined,
      source: r.source as string | undefined,
      payoutDescription: r.payoutDescription as string | undefined,
      paymentType: r.paymentType as string | undefined
    }));

    return {
      output: {
        rewards,
        total: result.total as number | undefined,
        offset: result.offset as number | undefined
      },
      message: `Retrieved **${rewards.length}** reward(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
