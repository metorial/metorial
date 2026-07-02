import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let proposalSectionSchema = z.object({
  sectionId: z.number().describe('Section ID'),
  name: z.string().describe('Section name'),
  sectionType: z.string().describe('Section type: opening or closing'),
  description: z.string().nullable().describe('Section content (HTML)'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL')
});

export let listProposalSections = SlateTool.create(spec, {
  name: 'List Proposal Sections',
  key: 'list_proposal_sections',
  description: `Retrieve sections (content blocks) within a specific proposal. Optionally filter by section type (opening or closing).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      sectionType: z.enum(['opening', 'closing']).optional().describe('Filter by section type')
    })
  )
  .output(
    z.object({
      sections: z.array(proposalSectionSchema).describe('List of proposal sections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listProposalSections(ctx.input.proposalId, ctx.input.sectionType);

    let sections = (Array.isArray(data) ? data : []).map((s: any) => ({
      sectionId: s.id,
      name: s.name,
      sectionType: s.sectiontype,
      description: s.description ?? null,
      url: s.url,
      appUrl: s.app_url
    }));

    return {
      output: { sections },
      message: `Found **${sections.length}** section(s) in proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let addProposalSection = SlateTool.create(spec, {
  name: 'Add Proposal Section',
  key: 'add_proposal_section',
  description: `Add a new content section to a proposal. Sections are either "opening" (displayed before fees) or "closing" (displayed after fees). Content supports HTML formatting.`,
  instructions: [
    'Use HTML in the description for rich text formatting.',
    'Opening sections appear before the fees section; closing sections appear after.'
  ]
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      name: z.string().describe('Section name'),
      sectionType: z.enum(['opening', 'closing']).describe('Section type'),
      description: z.string().optional().describe('Section content (HTML supported)')
    })
  )
  .output(proposalSectionSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      sectiontype: ctx.input.sectionType
    };

    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let s = await client.createProposalSection(ctx.input.proposalId, body);

    return {
      output: {
        sectionId: s.id,
        name: s.name,
        sectionType: s.sectiontype,
        description: s.description ?? null,
        url: s.url,
        appUrl: s.app_url
      },
      message: `Added ${s.sectiontype} section **${s.name}** to proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let updateProposalSection = SlateTool.create(spec, {
  name: 'Update Proposal Section',
  key: 'update_proposal_section',
  description: `Update a content section within a proposal. Only the provided fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      sectionId: z.number().describe('ID of the section to update'),
      name: z.string().optional().describe('Updated section name'),
      sectionType: z.enum(['opening', 'closing']).optional().describe('Updated section type'),
      description: z.string().optional().describe('Updated content (HTML)')
    })
  )
  .output(proposalSectionSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.sectionType !== undefined) body.sectiontype = ctx.input.sectionType;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let s = await client.updateProposalSection(
      ctx.input.proposalId,
      ctx.input.sectionId,
      body
    );

    return {
      output: {
        sectionId: s.id,
        name: s.name,
        sectionType: s.sectiontype,
        description: s.description ?? null,
        url: s.url,
        appUrl: s.app_url
      },
      message: `Updated section **${s.name}** in proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let removeProposalSection = SlateTool.create(spec, {
  name: 'Remove Proposal Section',
  key: 'remove_proposal_section',
  description: `Remove a content section from a proposal.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      sectionId: z.number().describe('ID of the section to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteProposalSection(ctx.input.proposalId, ctx.input.sectionId);

    return {
      output: { success: true },
      message: `Removed section ${ctx.input.sectionId} from proposal ${ctx.input.proposalId}.`
    };
  })
  .build();
