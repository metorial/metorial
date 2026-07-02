import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Unique member ID'),
  displayName: z.string().optional().describe('Display name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  externalIdentifier: z.string().optional().describe('External system ID'),
  programId: z.string().optional().describe('Associated program ID'),
  programTitle: z.string().optional().describe('Associated program title'),
  referralCode: z.string().optional().describe('Unique referral code'),
  referralUrl: z.string().optional().describe('Sharing referral URL'),
  disabledFlag: z.boolean().optional().describe('Whether member is disabled'),
  status: z.string().optional().describe('Member status'),
  referrals: z.number().optional().describe('Total referral count'),
  referralsApproved: z.number().optional().describe('Approved referral count'),
  referralsPending: z.number().optional().describe('Pending referral count'),
  rewardAmountTotal: z.number().optional().describe('Total rewards amount'),
  emailShares: z.number().optional().describe('Email share count'),
  socialShares: z.number().optional().describe('Social share count'),
  views: z.number().optional().describe('View count'),
  createDt: z.string().optional().describe('Creation date')
});

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List and search members (advocates) in referral programs. Filter by program, date range, or search term (email, external ID, or referral code). Supports pagination and sorting.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID, name, or title'),
      query: z
        .string()
        .optional()
        .describe('Search by email, internal ID, external ID, or referral code'),
      showDisabled: z.boolean().optional().describe('Include disabled members'),
      sort: z.enum(['Create_Dt_Desc', 'Create_Dt_Asc']).optional().describe('Sort order'),
      dateFrom: z
        .string()
        .optional()
        .describe('Show members created after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Show members created before this date (YYYY-MM-DD)'),
      offset: z.number().optional().describe('Starting index for pagination (0-based)'),
      count: z.number().optional().describe('Maximum number of members to return')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of members'),
      total: z.number().optional().describe('Total number of members matching filters'),
      offset: z.number().optional().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.listMembers({
      programId: ctx.input.programId,
      query: ctx.input.query,
      showDisabled: ctx.input.showDisabled,
      sort: ctx.input.sort,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      offset: ctx.input.offset,
      count: ctx.input.count
    });

    let members = ((result.members as Record<string, unknown>[]) || []).map(m => ({
      memberId: m.id as string,
      displayName: m.displayName as string | undefined,
      firstName: m.firstName as string | undefined,
      lastName: m.lastName as string | undefined,
      email: m.email as string | undefined,
      phone: m.phone as string | undefined,
      externalIdentifier: m.externalIdentifier as string | undefined,
      programId: m.programId as string | undefined,
      programTitle: m.programTitle as string | undefined,
      referralCode: m.referralCode as string | undefined,
      referralUrl: m.referralUrl as string | undefined,
      disabledFlag: m.disabledFlag as boolean | undefined,
      status: m.status as string | undefined,
      referrals: m.referrals as number | undefined,
      referralsApproved: m.referralsApproved as number | undefined,
      referralsPending: m.referralsPending as number | undefined,
      rewardAmountTotal: m.rewardAmountTotal as number | undefined,
      emailShares: m.emailShares as number | undefined,
      socialShares: m.socialShares as number | undefined,
      views: m.views as number | undefined,
      createDt: m.createDt as string | undefined
    }));

    return {
      output: {
        members,
        total: result.total as number | undefined,
        offset: result.offset as number | undefined
      },
      message: `Retrieved **${members.length}** member(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
