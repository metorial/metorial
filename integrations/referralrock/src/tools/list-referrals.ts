import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let referralSchema = z.object({
  referralId: z.string().describe('Unique referral ID'),
  displayName: z.string().optional().describe('Display name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  externalIdentifier: z.string().optional().describe('External ID'),
  phoneNumber: z.string().optional().describe('Phone number'),
  amount: z.number().optional().describe('Referral amount'),
  amountFormatted: z.string().optional().describe('Formatted referral amount'),
  status: z
    .string()
    .optional()
    .describe('Referral status (pending, qualified, approved, denied)'),
  createDate: z.string().optional().describe('Creation date'),
  updateDate: z.string().optional().describe('Last updated date'),
  programId: z.string().optional().describe('Associated program ID'),
  programTitle: z.string().optional().describe('Associated program title'),
  referringMemberId: z.string().optional().describe('Referring member ID'),
  referringMemberName: z.string().optional().describe('Referring member name'),
  memberEmail: z.string().optional().describe('Referring member email'),
  memberReferralCode: z.string().optional().describe('Referring member referral code'),
  companyName: z.string().optional().describe('Company name'),
  note: z.string().optional().describe('Internal note'),
  approvedDate: z.string().optional().describe('Approved date'),
  qualifiedDate: z.string().optional().describe('Qualified date')
});

export let listReferrals = SlateTool.create(spec, {
  name: 'List Referrals',
  key: 'list_referrals',
  description: `List and filter referrals across programs. Filter by program, referring member, status, date range, or search term. Supports multiple sort options and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID, name, or title'),
      memberId: z.string().optional().describe('Filter by referring member ID'),
      query: z
        .string()
        .optional()
        .describe('Search by email, internal ID, external ID, or referral code'),
      status: z
        .enum(['pending', 'qualified', 'approved', 'denied'])
        .optional()
        .describe('Filter by referral status'),
      sort: z
        .enum([
          'Create_Dt_Desc',
          'Create_Dt_Asc',
          'Amount_Desc',
          'Amount_Asc',
          'Qualified_Dt_Desc',
          'Qualified_Dt_Asc',
          'Closed_Dt_Desc',
          'Closed_Dt_Asc'
        ])
        .optional()
        .describe('Sort order'),
      dateFrom: z
        .string()
        .optional()
        .describe('Referrals created after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Referrals created before this date (YYYY-MM-DD)'),
      offset: z.number().optional().describe('Starting index for pagination (0-based)'),
      count: z.number().optional().describe('Maximum number of referrals to return')
    })
  )
  .output(
    z.object({
      referrals: z.array(referralSchema).describe('List of referrals'),
      total: z.number().optional().describe('Total number of referrals matching filters'),
      offset: z.number().optional().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    let result = await client.listReferrals({
      programId: ctx.input.programId,
      memberId: ctx.input.memberId,
      query: ctx.input.query,
      status: ctx.input.status,
      sort: ctx.input.sort,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      offset: ctx.input.offset,
      count: ctx.input.count
    });

    let referrals = ((result.referrals as Record<string, unknown>[]) || []).map(r => ({
      referralId: r.id as string,
      displayName: r.displayName as string | undefined,
      firstName: r.firstName as string | undefined,
      lastName: r.lastName as string | undefined,
      email: r.email as string | undefined,
      externalIdentifier: r.externalIdentifier as string | undefined,
      phoneNumber: r.phoneNumber as string | undefined,
      amount: r.amount as number | undefined,
      amountFormatted: r.amountFormatted as string | undefined,
      status: r.status as string | undefined,
      createDate: r.createDate as string | undefined,
      updateDate: r.updateDate as string | undefined,
      programId: r.programId as string | undefined,
      programTitle: r.programTitle as string | undefined,
      referringMemberId: r.referringMemberId as string | undefined,
      referringMemberName: r.referringMemberName as string | undefined,
      memberEmail: r.memberEmail as string | undefined,
      memberReferralCode: r.memberReferralCode as string | undefined,
      companyName: r.companyName as string | undefined,
      note: r.note as string | undefined,
      approvedDate: r.approvedDate as string | undefined,
      qualifiedDate: r.qualifiedDate as string | undefined
    }));

    return {
      output: {
        referrals,
        total: result.total as number | undefined,
        offset: result.offset as number | undefined
      },
      message: `Retrieved **${referrals.length}** referral(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
