import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

export let createProposal = SlateTool.create(spec, {
  name: 'Create Proposal',
  key: 'create_proposal',
  description: `Create a new proposal in Bidsketch. Can create from scratch or from an existing template. When using a template, the proposal is pre-populated with the template's sections and fees.`,
  instructions: [
    'Provide a templateId to create from a saved template, or omit it to create from scratch.',
    'After creating a proposal, use the proposal section and fee tools to add content.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Proposal name/title'),
      clientId: z.number().describe('ID of the client this proposal is for'),
      description: z.string().optional().describe('Proposal description/summary'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID to create the proposal from. Omit to create from scratch.'),
      currency: z.string().optional().describe('ISO 4217 currency code (e.g. "USD")'),
      proposalDate: z.string().optional().describe('Proposal date (e.g. "10/26/2024")'),
      tax: z.number().optional().describe('Primary tax rate as decimal (e.g. 0.1 for 10%)'),
      tax2: z.number().optional().describe('Secondary tax rate as decimal'),
      discount: z.number().optional().describe('Discount percentage as decimal'),
      settings: z
        .object({
          approvalMessage: z.string().optional().describe('Custom approval message (HTML)'),
          optionalFeesNote: z.string().optional().describe('Note for optional fees'),
          optionalFeesTitle: z.string().optional().describe('Title for optional fees section'),
          proposalFeesTitle: z.string().optional().describe('Title for fees section'),
          includeOptionalFeesInTotals: z
            .boolean()
            .optional()
            .describe('Include optional fees in totals'),
          hideMonthlyTotal: z.boolean().optional().describe('Hide monthly total'),
          hideProjectTotal: z.boolean().optional().describe('Hide project total'),
          hideYearlyTotal: z.boolean().optional().describe('Hide yearly total'),
          hideGrandTotal: z.boolean().optional().describe('Hide grand total')
        })
        .optional()
        .describe('Proposal display settings')
    })
  )
  .output(
    z.object({
      proposalId: z.number().describe('ID of the newly created proposal'),
      name: z.string().describe('Proposal name'),
      status: z.string().describe('Proposal status'),
      isDraft: z.boolean().describe('Whether the proposal is a draft'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      client_id: ctx.input.clientId
    };

    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.currency !== undefined) body.currency = ctx.input.currency;
    if (ctx.input.proposalDate !== undefined) body.proposal_date = ctx.input.proposalDate;
    if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) body.tax2 = ctx.input.tax2;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;

    if (ctx.input.settings) {
      let s: Record<string, unknown> = {};
      if (ctx.input.settings.approvalMessage !== undefined)
        s.approval_message = ctx.input.settings.approvalMessage;
      if (ctx.input.settings.optionalFeesNote !== undefined)
        s.optional_fees_note = ctx.input.settings.optionalFeesNote;
      if (ctx.input.settings.optionalFeesTitle !== undefined)
        s.optional_fees_title = ctx.input.settings.optionalFeesTitle;
      if (ctx.input.settings.proposalFeesTitle !== undefined)
        s.proposal_fees_title = ctx.input.settings.proposalFeesTitle;
      if (ctx.input.settings.includeOptionalFeesInTotals !== undefined)
        s.include_optional_fees_in_totals = ctx.input.settings.includeOptionalFeesInTotals;
      if (ctx.input.settings.hideMonthlyTotal !== undefined)
        s.hide_monthly_total = ctx.input.settings.hideMonthlyTotal;
      if (ctx.input.settings.hideProjectTotal !== undefined)
        s.hide_project_total = ctx.input.settings.hideProjectTotal;
      if (ctx.input.settings.hideYearlyTotal !== undefined)
        s.hide_yearly_total = ctx.input.settings.hideYearlyTotal;
      if (ctx.input.settings.hideGrandTotal !== undefined)
        s.hide_grand_total = ctx.input.settings.hideGrandTotal;
      body.settings = s;
    }

    let p = ctx.input.templateId
      ? await client.createProposalFromTemplate(ctx.input.templateId, body)
      : await client.createProposal(body);

    return {
      output: {
        proposalId: p.id,
        name: p.name,
        status: p.status,
        isDraft: p.is_draft,
        url: p.url,
        appUrl: p.app_url,
        createdAt: p.created_at
      },
      message: `Created proposal **${p.name}** (ID: ${p.id})${ctx.input.templateId ? ' from template' : ''}.`
    };
  })
  .build();
