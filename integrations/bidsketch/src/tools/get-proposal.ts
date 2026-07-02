import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let getProposal = SlateTool.create(spec, {
  name: 'Get Proposal',
  key: 'get_proposal',
  description: `Retrieve detailed information about a specific proposal. Optionally include full content (sections and fees) by setting \`includeContent\` to true.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .describe('If true, fetches full proposal content including all sections and fees')
    })
  )
  .output(
    z.object({
      proposalId: z.number().describe('Unique proposal ID'),
      name: z.string().describe('Proposal name'),
      description: z.string().nullable().describe('Proposal description'),
      status: z.string().describe('Status: Pending, Viewed, Accepted, or Declined'),
      isDraft: z.boolean().describe('Whether the proposal is a draft'),
      currency: z.string().nullable().describe('ISO 4217 currency code'),
      proposalDate: z.string().nullable().describe('Proposal date'),
      tax: z.number().nullable().describe('Primary tax rate (decimal, e.g. 0.1 = 10%)'),
      tax2: z.number().nullable().describe('Secondary tax rate'),
      discount: z.number().nullable().describe('Discount percentage'),
      total: z.number().nullable().describe('Total amount'),
      monthlyFees: z.number().nullable().describe('Monthly fees total'),
      yearlyFees: z.number().nullable().describe('Yearly fees total'),
      oneTimeFees: z.number().nullable().describe('One-time fees total'),
      user: z.string().nullable().describe('Proposal owner name'),
      client: z
        .object({
          clientId: z.number(),
          name: z.string(),
          url: z.string(),
          appUrl: z.string()
        })
        .nullable()
        .describe('Associated client'),
      settings: z
        .object({
          approvalMessage: z.string().nullable(),
          optionalFeesNote: z.string().nullable(),
          optionalFeesTitle: z.string().nullable(),
          proposalFeesTitle: z.string().nullable(),
          includeOptionalFeesInTotals: z.boolean().nullable(),
          hideMonthlyTotal: z.boolean().nullable(),
          hideProjectTotal: z.boolean().nullable(),
          hideYearlyTotal: z.boolean().nullable(),
          hideGrandTotal: z.boolean().nullable()
        })
        .nullable()
        .describe('Proposal display settings'),
      content: z
        .any()
        .nullable()
        .describe('Full proposal content (sections and fees) when includeContent is true'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let p = ctx.input.includeContent
      ? await client.getProposalContent(ctx.input.proposalId)
      : await client.getProposal(ctx.input.proposalId);

    let settings = p.settings
      ? {
          approvalMessage: p.settings.approval_message ?? null,
          optionalFeesNote: p.settings.optional_fees_note ?? null,
          optionalFeesTitle: p.settings.optional_fees_title ?? null,
          proposalFeesTitle: p.settings.proposal_fees_title ?? null,
          includeOptionalFeesInTotals: p.settings.include_optional_fees_in_totals ?? null,
          hideMonthlyTotal: p.settings.hide_monthly_total ?? null,
          hideProjectTotal: p.settings.hide_project_total ?? null,
          hideYearlyTotal: p.settings.hide_yearly_total ?? null,
          hideGrandTotal: p.settings.hide_grand_total ?? null
        }
      : null;

    return {
      output: {
        proposalId: p.id,
        name: p.name,
        description: p.description ?? null,
        status: p.status,
        isDraft: p.is_draft,
        currency: p.currency ?? null,
        proposalDate: p.proposal_date ?? null,
        tax: p.tax ?? null,
        tax2: p.tax2 ?? null,
        discount: p.discount ?? null,
        total: p.total ?? null,
        monthlyFees: p.monthly_fees ?? null,
        yearlyFees: p.yearly_fees ?? null,
        oneTimeFees: p.one_time_fees ?? null,
        user: p.user ?? null,
        client: p.client
          ? {
              clientId: p.client.id,
              name: p.client.name,
              url: p.client.url,
              appUrl: p.client.app_url
            }
          : null,
        settings,
        content: p.content ?? null,
        url: p.url,
        appUrl: p.app_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      },
      message: `Retrieved proposal **${p.name}** (Status: ${p.status}).`
    };
  })
  .build();
