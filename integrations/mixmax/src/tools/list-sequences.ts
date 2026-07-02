import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _recipientSchema = z.object({
  email: z.string().describe('Recipient email address'),
  name: z.string().optional().describe('Recipient name')
});

let sequenceSchema = z.object({
  sequenceId: z.string().describe('Unique identifier for the sequence'),
  name: z.string().optional().describe('Name of the sequence'),
  userId: z.string().optional().describe('Owner user ID'),
  numStages: z.number().optional().describe('Number of stages in the sequence'),
  createdAt: z.string().optional().describe('When the sequence was created'),
  updatedAt: z.string().optional().describe('When the sequence was last updated')
});

export let listSequences = SlateTool.create(spec, {
  name: 'List Sequences',
  key: 'list_sequences',
  description: `List and search automated email sequences. Returns sequences you have access to, with optional search filtering. Use this to find sequences before adding recipients or viewing their details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter sequences by name'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 50)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      sequences: z.array(sequenceSchema).describe('List of sequences'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      hasNext: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: any;
    if (ctx.input.search) {
      data = await client.searchSequences(ctx.input.search);
    } else {
      data = await client.listSequences({
        limit: ctx.input.limit,
        next: ctx.input.cursor
      });
    }

    let results = data.results || data || [];
    let sequences = results.map((s: any) => ({
      sequenceId: s._id,
      name: s.name,
      userId: s.userId,
      numStages: s.numStages,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return {
      output: {
        sequences,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${sequences.length} sequence(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
