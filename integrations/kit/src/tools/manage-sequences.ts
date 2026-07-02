import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSequences = SlateTool.create(spec, {
  name: 'Manage Sequences',
  key: 'manage_sequences',
  description: `List email sequences (drip campaigns) and add subscribers to sequences. Subscribers can be identified by ID or email address.`
})
  .input(
    z.object({
      action: z.enum(['list', 'add_subscriber']).describe('The operation to perform'),
      sequenceId: z.number().optional().describe('Sequence ID (required for add_subscriber)'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID to add (for add_subscriber)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Subscriber email to add (for add_subscriber)')
    })
  )
  .output(
    z.object({
      sequences: z
        .array(
          z.object({
            sequenceId: z.number().describe('Unique sequence ID'),
            name: z.string().describe('Sequence name'),
            hold: z.boolean().describe('Whether the sequence is on hold'),
            repeat: z.boolean().describe('Whether the sequence repeats'),
            createdAt: z.string().describe('When the sequence was created')
          })
        )
        .optional()
        .describe('List of sequences'),
      subscriber: z
        .object({
          subscriberId: z.number().describe('Subscriber ID'),
          emailAddress: z.string().describe('Subscriber email'),
          state: z.string().describe('Subscriber state')
        })
        .optional()
        .describe('Subscriber added to sequence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listSequences();
      let sequences = result.data.map(s => ({
        sequenceId: s.id,
        name: s.name,
        hold: s.hold,
        repeat: s.repeat,
        createdAt: s.created_at
      }));
      return {
        output: { sequences },
        message: `Found **${sequences.length}** sequences.`
      };
    }

    if (ctx.input.action === 'add_subscriber') {
      if (!ctx.input.sequenceId) throw new Error('Sequence ID is required');
      if (!ctx.input.subscriberId && !ctx.input.emailAddress) {
        throw new Error('Provide either subscriberId or emailAddress');
      }

      let data: any;
      if (ctx.input.subscriberId) {
        data = await client.addSubscriberToSequence(
          ctx.input.sequenceId,
          ctx.input.subscriberId
        );
      } else {
        data = await client.addSubscriberToSequenceByEmail(
          ctx.input.sequenceId,
          ctx.input.emailAddress!
        );
      }

      let s = data.subscriber;
      return {
        output: {
          subscriber: {
            subscriberId: s.id,
            emailAddress: s.email_address,
            state: s.state
          }
        },
        message: `Added **${s.email_address}** to sequence \`${ctx.input.sequenceId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
