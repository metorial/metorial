import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOpportunityTool = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new opportunity (candidacy) in Lever. Provide candidate contact information and optionally assign to a posting, stage, owner, and tags. Lever automatically deduplicates candidates by email address.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the candidate'),
      headline: z.string().optional().describe('Candidate headline or current title'),
      location: z.string().optional().describe('Candidate location'),
      emails: z.array(z.string()).optional().describe('Candidate email addresses'),
      phones: z
        .array(
          z.object({
            type: z.enum(['mobile', 'home', 'work', 'other']).optional(),
            value: z.string()
          })
        )
        .optional()
        .describe('Candidate phone numbers'),
      links: z.array(z.string()).optional().describe('Links (LinkedIn, portfolio, etc.)'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the opportunity'),
      sources: z.array(z.string()).optional().describe('Sources for this opportunity'),
      origin: z
        .enum(['applied', 'sourced', 'referred', 'university', 'agency', 'internal'])
        .optional()
        .describe('How the candidate was sourced'),
      postingId: z.string().optional().describe('Posting ID to associate with'),
      stageId: z.string().optional().describe('Initial pipeline stage ID'),
      ownerId: z.string().optional().describe('User ID of the opportunity owner')
    })
  )
  .output(
    z.object({
      opportunityId: z.string().describe('ID of the created opportunity'),
      contactId: z.string().describe('ID of the candidate contact'),
      opportunity: z.any().describe('The full created opportunity object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let data: Record<string, any> = {
      name: ctx.input.name
    };
    if (ctx.input.headline) data.headline = ctx.input.headline;
    if (ctx.input.location) data.location = ctx.input.location;
    if (ctx.input.emails) data.emails = ctx.input.emails;
    if (ctx.input.phones) data.phones = ctx.input.phones;
    if (ctx.input.links) data.links = ctx.input.links;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.sources) data.sources = ctx.input.sources;
    if (ctx.input.origin) data.origin = ctx.input.origin;
    if (ctx.input.postingId) data.postings = [ctx.input.postingId];
    if (ctx.input.stageId) data.stage = ctx.input.stageId;
    if (ctx.input.ownerId) data.owner = ctx.input.ownerId;

    let result = await client.createOpportunity(data);

    return {
      output: {
        opportunityId: result.data.id,
        contactId: result.data.contact,
        opportunity: result.data
      },
      message: `Created opportunity for **${ctx.input.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
