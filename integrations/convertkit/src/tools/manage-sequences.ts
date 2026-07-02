import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSequences = SlateTool.create(spec, {
  name: 'Manage Sequences',
  key: 'manage_sequences',
  description: `List email sequences or enroll subscribers in a sequence. Sequences are automated drip email campaigns that send a series of emails over time.`,
  instructions: [
    'Use action "list" to view all sequences.',
    'Use action "add_subscriber" to enroll a subscriber — provide sequenceId and either subscriberId or subscriberEmail.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add_subscriber']).describe('Action to perform'),
      sequenceId: z.number().optional().describe('Sequence ID (required for add_subscriber)'),
      subscriberId: z.number().optional().describe('Subscriber ID to enroll'),
      subscriberEmail: z.string().optional().describe('Subscriber email to enroll'),
      perPage: z.number().optional().describe('Results per page'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      sequences: z
        .array(
          z.object({
            sequenceId: z.number().describe('Sequence ID'),
            sequenceName: z.string().describe('Sequence name'),
            hold: z.boolean().describe('Whether the sequence is on hold'),
            repeat: z.boolean().describe('Whether the sequence repeats'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of sequences (for list action)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listSequences({ perPage: input.perPage, after: input.cursor });
      let sequences = result.sequences.map(s => ({
        sequenceId: s.id,
        sequenceName: s.name,
        hold: s.hold,
        repeat: s.repeat,
        createdAt: s.created_at
      }));
      return {
        output: {
          sequences,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${sequences.length}** sequence(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'add_subscriber') {
      if (!input.sequenceId) throw new Error('sequenceId is required for add_subscriber');
      if (input.subscriberId) {
        await client.addSubscriberToSequenceById(input.sequenceId, input.subscriberId);
        return {
          output: {},
          message: `Enrolled subscriber #${input.subscriberId} in sequence #${input.sequenceId}`
        };
      } else if (input.subscriberEmail) {
        await client.addSubscriberToSequenceByEmail(input.sequenceId, input.subscriberEmail);
        return {
          output: {},
          message: `Enrolled **${input.subscriberEmail}** in sequence #${input.sequenceId}`
        };
      }
      throw new Error('subscriberId or subscriberEmail is required for add_subscriber');
    }

    throw new Error(`Unknown action: ${input.action}`);
  });
