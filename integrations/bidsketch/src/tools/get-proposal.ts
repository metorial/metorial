import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import {
  readBidsketchBoolean,
  readBidsketchNumber,
  readBidsketchRecord,
  readBidsketchString
} from '../lib/response';
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
      tax: z.number().nullable().describe('Calculated primary tax amount'),
      tax2: z.number().nullable().describe('Calculated secondary tax amount'),
      discount: z.number().nullable().describe('Calculated discount amount'),
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

    let p = await client.getProposal(ctx.input.proposalId);
    if (ctx.input.includeContent) {
      let expanded = await client.getProposalContent(ctx.input.proposalId);
      p = { ...p, content: readBidsketchRecord(expanded.content, 'proposal content') };
    }

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
        proposalId: readBidsketchNumber(p.id, 'id'),
        name: readBidsketchString(p.name, 'name'),
        description: p.description ?? null,
        status: readBidsketchString(p.status, 'status'),
        isDraft: readBidsketchBoolean(p.is_draft, 'is_draft'),
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
              clientId: readBidsketchNumber(p.client.id, 'client id'),
              name: readBidsketchString(p.client.name, 'client name'),
              url: readBidsketchString(p.client.url, 'client url'),
              appUrl: readBidsketchString(p.client.app_url, 'client app_url')
            }
          : null,
        settings,
        content: p.content ?? null,
        url: readBidsketchString(p.url, 'url'),
        appUrl: readBidsketchString(p.app_url, 'app_url'),
        createdAt: readBidsketchString(p.created_at, 'created_at'),
        updatedAt: readBidsketchString(p.updated_at, 'updated_at')
      },
      message: `Retrieved proposal **${p.name}** (Status: ${p.status}).`
    };
  })
  .build();
