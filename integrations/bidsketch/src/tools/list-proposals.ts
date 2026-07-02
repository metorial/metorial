import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let proposalSummarySchema = z.object({
  proposalId: z.number().describe('Unique proposal ID'),
  name: z.string().describe('Proposal name'),
  description: z.string().nullable().describe('Proposal description'),
  status: z.string().describe('Status: Pending, Viewed, Accepted, or Declined'),
  isDraft: z.boolean().describe('Whether the proposal is a draft'),
  currency: z.string().nullable().describe('ISO 4217 currency code'),
  total: z.number().nullable().describe('Total amount'),
  monthlyFees: z.number().nullable().describe('Monthly fees total'),
  yearlyFees: z.number().nullable().describe('Yearly fees total'),
  oneTimeFees: z.number().nullable().describe('One-time fees total'),
  user: z.string().nullable().describe('Proposal owner name'),
  client: z
    .object({
      clientId: z.number().describe('Client ID'),
      name: z.string().describe('Client name'),
      url: z.string().describe('Client API URL'),
      appUrl: z.string().describe('Client app URL')
    })
    .nullable()
    .describe('Associated client'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listProposals = SlateTool.create(spec, {
  name: 'List Proposals',
  key: 'list_proposals',
  description: `Retrieve proposals from Bidsketch. Can list all proposals or filter by client. Supports pagination. Returns proposal metadata including status, totals, and client association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().optional().describe('Filter proposals by client ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of proposals per page (max 100)')
    })
  )
  .output(
    z.object({
      proposals: z.array(proposalSummarySchema).describe('List of proposals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let data = ctx.input.clientId
      ? await client.getClientProposals(ctx.input.clientId, ctx.input.page, ctx.input.perPage)
      : await client.listProposals(ctx.input.page, ctx.input.perPage);

    let proposals = (Array.isArray(data) ? data : []).map((p: any) => ({
      proposalId: p.id,
      name: p.name,
      description: p.description ?? null,
      status: p.status,
      isDraft: p.is_draft,
      currency: p.currency ?? null,
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
      url: p.url,
      appUrl: p.app_url,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));

    return {
      output: { proposals },
      message: `Found **${proposals.length}** proposal(s).`
    };
  })
  .build();
