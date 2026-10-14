import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

export let getMemberStats = SlateTool.create(spec, {
  name: 'Get Member Statistics',
  key: 'get_member_stats',
  description:
    'Get sharing, referral, and reward statistics for a member over a chosen period. Use list_members to find a member ID or referral code.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe('Member ID, email address, external ID, or referral code'),
      timePeriod: z
        .enum(['All', 'MonthToDate', 'LastMonth', 'Last7Days', 'Last30Days'])
        .optional()
        .describe('Statistics period; defaults to All')
    })
  )
  .output(
    z.object({
      query: z.string().describe('Member identifier used for the request'),
      timePeriod: z.string().describe('Statistics period'),
      memberViews: z.number().optional().describe('Member page views'),
      memberShares: z.number().optional().describe('Member share links followed'),
      referralsCount: z.number().optional().describe('Number of referrals'),
      lastShare: z.string().optional().describe('Most recent share date'),
      referralsApproved: z.number().optional().describe('Approved referral count'),
      referralsQualified: z.number().optional().describe('Qualified referral count'),
      referralsPending: z.number().optional().describe('Pending referral count'),
      referralsViews: z.number().optional().describe('Referral page views'),
      referralsApprovedAmount: z.number().optional().describe('Approved referral spending'),
      rewardsPendingAmount: z.number().optional().describe('Pending reward value'),
      rewardsIssuedAmount: z.number().optional().describe('Issued reward value'),
      rewardAmountTotal: z.number().optional().describe('Pending and issued reward value'),
      rewardsCount: z.number().optional().describe('Reward count'),
      activatedDate: z.string().optional().describe('Activation date'),
      lastActiveDate: z.string().optional().describe('Most recent activity date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });
    let timePeriod = ctx.input.timePeriod ?? 'All';
    let result = await client.getMemberStats(ctx.input.query, timePeriod);
    return {
      output: {
        query: ctx.input.query,
        timePeriod,
        memberViews: result.memberViews as number | undefined,
        memberShares: result.memberShares as number | undefined,
        referralsCount: result.referralsCount as number | undefined,
        lastShare: result.lastShare as string | undefined,
        referralsApproved: result.referralsApproved as number | undefined,
        referralsQualified: result.referralsQualified as number | undefined,
        referralsPending: result.referralsPending as number | undefined,
        referralsViews: result.referralsViews as number | undefined,
        referralsApprovedAmount: result.referralsApprovedAmount as number | undefined,
        rewardsPendingAmount: result.rewardsPendingAmount as number | undefined,
        rewardsIssuedAmount: result.rewardsIssuedAmount as number | undefined,
        rewardAmountTotal: result.rewardAmountTotal as number | undefined,
        rewardsCount: result.rewardsCount as number | undefined,
        activatedDate: result.activatedDate as string | undefined,
        lastActiveDate: result.lastActiveDate as string | undefined
      },
      message: `Retrieved **${timePeriod}** statistics for member **${ctx.input.query}**.`
    };
  })
  .build();
