import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sequenceSchema = z.object({
  sequenceId: z.string().optional().describe('Unique identifier for the sequence'),
  name: z.string().optional().describe('Sequence name'),
  description: z.string().optional().describe('Sequence description')
});

export let getSequence = SlateTool.create(spec, {
  name: 'Get Sequence',
  key: 'get_sequence',
  description: `Retrieve a single email outreach sequence by ID, or list all sequences with optional filtering and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sequenceId: z
        .string()
        .optional()
        .describe('ID of a specific sequence to retrieve. If omitted, lists all sequences.'),
      search: z.string().optional().describe('Search keyword to filter sequences'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      sequence: sequenceSchema
        .optional()
        .describe('Single sequence (when sequenceId is provided)'),
      sequences: z
        .array(sequenceSchema)
        .optional()
        .describe('List of sequences (when listing)'),
      totalCount: z.number().optional().describe('Total count when listing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.sequenceId) {
      let result = await client.getSequence(ctx.input.sequenceId);
      return {
        output: {
          sequence: {
            sequenceId: result.id ?? result.sequence_id,
            name: result.name,
            description: result.description
          }
        },
        message: `Retrieved sequence **${result.name ?? ctx.input.sequenceId}**.`
      };
    }

    let result = await client.getSequences({
      search: ctx.input.search,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let sequences = result.data ?? result.sequences ?? result ?? [];
    let sequencesArray = Array.isArray(sequences) ? sequences : [];

    return {
      output: {
        sequences: sequencesArray.map((seq: any) => ({
          sequenceId: seq.id ?? seq.sequence_id,
          name: seq.name,
          description: seq.description
        })),
        totalCount: result.total ?? result.totalCount
      },
      message: `Found **${sequencesArray.length}** sequence(s).`
    };
  })
  .build();

export let createSequence = SlateTool.create(spec, {
  name: 'Create Sequence',
  key: 'create_sequence',
  description: `Create a new email outreach sequence in GetProspect. Sequences are used to automate multi-step email campaigns.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the sequence'),
      description: z.string().optional().describe('Description of the sequence')
    })
  )
  .output(
    z.object({
      sequenceId: z.string().optional().describe('ID of the newly created sequence'),
      name: z.string().optional().describe('Sequence name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSequence({
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        sequenceId: result.id ?? result.sequence_id,
        name: result.name ?? ctx.input.name
      },
      message: `Created sequence **${ctx.input.name}**.`
    };
  })
  .build();

export let updateSequence = SlateTool.create(spec, {
  name: 'Update Sequence',
  key: 'update_sequence',
  description: `Update an existing email outreach sequence's name or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('ID of the sequence to update'),
      name: z.string().optional().describe('New name for the sequence'),
      description: z.string().optional().describe('New description')
    })
  )
  .output(
    z.object({
      sequenceId: z.string().optional().describe('ID of the updated sequence'),
      name: z.string().optional().describe('Updated sequence name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateSequence(ctx.input.sequenceId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        sequenceId: result.id ?? result.sequence_id ?? ctx.input.sequenceId,
        name: result.name
      },
      message: `Updated sequence **${ctx.input.sequenceId}**.`
    };
  })
  .build();

export let deleteSequence = SlateTool.create(spec, {
  name: 'Delete Sequence',
  key: 'delete_sequence',
  description: `Permanently delete an email outreach sequence from GetProspect. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sequenceId: z.string().describe('ID of the sequence to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSequence(ctx.input.sequenceId);

    return {
      output: { success: true },
      message: `Deleted sequence **${ctx.input.sequenceId}**.`
    };
  })
  .build();
