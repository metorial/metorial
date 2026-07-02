import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let createEntry = SlateTool.create(spec, {
  name: 'Create Entry',
  key: 'create_entry',
  description: `Log a note or activity entry against a party, opportunity, or project in Capsule CRM. Entries represent communication history such as notes, emails, and meetings.`,
  instructions: [
    'You must link the entry to exactly one of: a party, an opportunity, or a project.'
  ]
})
  .input(
    z.object({
      content: z.string().describe('Content/body of the entry (supports plain text)'),
      partyId: z.number().optional().describe('Link to a party by ID'),
      opportunityId: z.number().optional().describe('Link to an opportunity by ID'),
      projectId: z.number().optional().describe('Link to a project by ID')
    })
  )
  .output(
    z.object({
      entryId: z.number().describe('ID of the created entry'),
      type: z.string().optional().describe('Entry type (e.g. note)'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let entry: Record<string, any> = {
      type: 'note',
      content: ctx.input.content
    };

    if (ctx.input.partyId) entry.party = { id: ctx.input.partyId };
    if (ctx.input.opportunityId) entry.opportunity = { id: ctx.input.opportunityId };
    if (ctx.input.projectId) entry.kase = { id: ctx.input.projectId };

    let result = await client.createEntry(entry);

    return {
      output: {
        entryId: result.id,
        type: result.type,
        createdAt: result.createdAt
      },
      message: `Created ${result.type ?? 'note'} entry (ID: ${result.id}).`
    };
  })
  .build();
