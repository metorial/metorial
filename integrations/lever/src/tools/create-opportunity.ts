import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, type Row, stringList, text } from '../lib/contracts';
import { spec } from '../spec';

export let createOpportunityTool = SlateTool.create(spec, {
  name: 'Create Opportunity',
  key: 'create_opportunity',
  description: `Create a new opportunity (candidacy) in Lever. Provide candidate contact information and optionally assign to a posting, stage, owner, and tags. Lever automatically deduplicates candidates by email address.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      performAsUserId: z
        .string()
        .optional()
        .describe(
          'Acting user ID required for this write. Call list_users to discover authorized users.'
        ),
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
    const data: Row = { name: text(ctx.input.name, 'Candidate name') };
    const actor = id(ctx.input.performAsUserId, 'Acting user ID; discover it with list_users');
    for (const key of ['headline', 'location'] as const)
      if (ctx.input[key] !== undefined) data[key] = text(ctx.input[key], key, true);
    for (const key of ['emails', 'links', 'tags', 'sources'] as const)
      if (ctx.input[key] !== undefined) data[key] = stringList(ctx.input[key], key);
    if (ctx.input.phones !== undefined)
      data.phones = ctx.input.phones.map(phone => ({
        ...phone,
        value: text(phone.value, 'Phone number')
      }));
    if (ctx.input.origin !== undefined) data.origin = ctx.input.origin;
    if (ctx.input.postingId !== undefined)
      data.postings = [id(ctx.input.postingId, 'Posting ID; discover it with list_postings')];
    if (ctx.input.stageId !== undefined)
      data.stage = id(ctx.input.stageId, 'Stage ID; discover it with get_pipeline_metadata');
    if (ctx.input.ownerId !== undefined)
      data.owner = id(ctx.input.ownerId, 'Owner ID; discover it with list_users');
    const result = await new Client(ctx.auth).createOpportunity(data, actor);
    return {
      output: {
        opportunityId: result.data.id,
        contactId: result.data.contact,
        opportunity: result.data
      },
      message: `Created opportunity ${result.data.id}.`
    };
  })
  .build();
