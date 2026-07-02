import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSequences = SlateTool.create(spec, {
  name: 'List Sequences',
  key: 'list_sequences',
  description: `Retrieve outreach sequences (campaigns) from your Reply.io account. Filter by name or status to find specific sequences. Returns sequence details including name, status, and owner information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter sequences by name'),
      status: z
        .enum(['Active', 'Paused', 'New', 'Archived'])
        .optional()
        .describe('Filter by sequence status'),
      top: z
        .number()
        .optional()
        .describe('Maximum number of sequences to return (default 25, max 1000)'),
      skip: z.number().optional().describe('Number of sequences to skip for pagination')
    })
  )
  .output(
    z.object({
      sequences: z.array(z.record(z.string(), z.any())).describe('List of sequences'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSequences({
      name: ctx.input.name,
      status: ctx.input.status,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let sequences = result?.items ?? result ?? [];
    let hasMore = result?.info?.hasMore ?? false;

    return {
      output: {
        sequences,
        hasMore
      },
      message: `Found **${sequences.length}** sequence(s).${hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
