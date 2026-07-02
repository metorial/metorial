import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

let entrySchema = z.object({
  entryId: z.number().describe('Unique identifier'),
  type: z.string().optional().describe('Entry type (note, email, etc.)'),
  content: z.string().optional().describe('Entry content'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 update timestamp'),
  entryDate: z.string().optional().describe('Entry date'),
  creator: z.any().optional().describe('User who created the entry'),
  party: z.any().optional().describe('Linked party'),
  opportunity: z.any().optional().describe('Linked opportunity'),
  kase: z.any().optional().describe('Linked project'),
  attachments: z.array(z.any()).optional().describe('File attachments')
});

export let listEntries = SlateTool.create(spec, {
  name: 'List Entries',
  key: 'list_entries',
  description: `List activity history entries from Capsule CRM. Can list all entries or entries for a specific party, opportunity, or project. Entries include notes, emails, and other logged activities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .enum(['parties', 'opportunities', 'kases'])
        .optional()
        .describe('Entity type to list entries for'),
      entityId: z
        .number()
        .optional()
        .describe('ID of the entity to list entries for (required if entityType is set)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 50)'),
      embed: z
        .array(z.enum(['party', 'kase', 'opportunity', 'creator', 'activityType']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).describe('List of entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.entityType && ctx.input.entityId) {
      result = await client.listEntriesForEntity(ctx.input.entityType, ctx.input.entityId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    } else {
      result = await client.listEntries({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        embed: ctx.input.embed
      });
    }

    let entries = (result.entries || []).map((e: any) => ({
      entryId: e.id,
      type: e.type,
      content: e.content,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      entryDate: e.entryDate,
      creator: e.creator,
      party: e.party,
      opportunity: e.opportunity,
      kase: e.kase,
      attachments: e.attachments
    }));

    return {
      output: { entries },
      message: `Retrieved **${entries.length}** entries.`
    };
  })
  .build();
