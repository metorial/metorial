import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { readBidsketchNumber, readBidsketchString } from '../lib/response';
import { spec } from '../spec';

export let getFee = SlateTool.create(spec, {
  name: 'Get Fee',
  key: 'get_fee',
  description:
    'Read a saved reusable fee, including its amount, quantity, currency, unit, category, and full HTML description. Discover fee IDs with list_fees.',
  tags: { readOnly: true }
})
  .input(z.object({ feeId: z.number().describe('Saved fee ID from list_fees') }))
  .output(z.object({ fee: z.record(z.string(), z.unknown()).describe('Complete saved fee') }))
  .handleInvocation(async ctx => {
    let fee = await new BidsketchClient(ctx.auth.token).getFee(ctx.input.feeId);
    readBidsketchNumber(fee.id, 'fee id');
    readBidsketchString(fee.name, 'fee name');
    return { output: { fee }, message: `Retrieved fee ${ctx.input.feeId}.` };
  })
  .build();

export let getSection = SlateTool.create(spec, {
  name: 'Get Section',
  key: 'get_section',
  description:
    'Read a saved reusable section, including its full HTML content, category, and opening or closing placement. Discover section IDs with list_sections.',
  tags: { readOnly: true }
})
  .input(z.object({ sectionId: z.number().describe('Saved section ID from list_sections') }))
  .output(
    z.object({ section: z.record(z.string(), z.unknown()).describe('Complete saved section') })
  )
  .handleInvocation(async ctx => {
    let section = await new BidsketchClient(ctx.auth.token).getSection(ctx.input.sectionId);
    readBidsketchNumber(section.id, 'section id');
    readBidsketchString(section.name, 'section name');
    return { output: { section }, message: `Retrieved section ${ctx.input.sectionId}.` };
  })
  .build();

export let getProposalFee = SlateTool.create(spec, {
  name: 'Get Proposal Fee',
  key: 'get_proposal_fee',
  description:
    'Read one fee belonging to a proposal, including its full description, optional flag, price, and quantity. Discover fee IDs with list_proposal_fees.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      proposalId: z.number().describe('Proposal ID from list_proposals'),
      feeId: z.number().describe('Proposal fee ID from list_proposal_fees')
    })
  )
  .output(
    z.object({ fee: z.record(z.string(), z.unknown()).describe('Complete proposal fee') })
  )
  .handleInvocation(async ctx => {
    let fee = await new BidsketchClient(ctx.auth.token).getProposalFee(
      ctx.input.proposalId,
      ctx.input.feeId
    );
    readBidsketchNumber(fee.id, 'fee id');
    readBidsketchString(fee.name, 'fee name');
    return { output: { fee }, message: `Retrieved fee ${ctx.input.feeId}.` };
  })
  .build();

export let getProposalSection = SlateTool.create(spec, {
  name: 'Get Proposal Section',
  key: 'get_proposal_section',
  description:
    'Read one section belonging to a proposal, including its full HTML content and opening or closing placement. Discover section IDs with list_proposal_sections.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      proposalId: z.number().describe('Proposal ID from list_proposals'),
      sectionId: z.number().describe('Proposal section ID from list_proposal_sections')
    })
  )
  .output(
    z.object({
      section: z.record(z.string(), z.unknown()).describe('Complete proposal section')
    })
  )
  .handleInvocation(async ctx => {
    let section = await new BidsketchClient(ctx.auth.token).getProposalSection(
      ctx.input.proposalId,
      ctx.input.sectionId
    );
    readBidsketchNumber(section.id, 'section id');
    readBidsketchString(section.name, 'section name');
    return { output: { section }, message: `Retrieved section ${ctx.input.sectionId}.` };
  })
  .build();
