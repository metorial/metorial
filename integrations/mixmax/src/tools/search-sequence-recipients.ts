import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSequenceRecipients = SlateTool.create(spec, {
  name: 'Search Sequence Recipients',
  key: 'search_sequence_recipients',
  description:
    'Search activated sequence recipients by email query or exact recipient emails, optionally within one sequence. Returns recipient and sequence IDs and native state; draft recipients are not promised by this endpoint.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Case-insensitive recipient email query. Provide query or recipients.'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Exact recipient email addresses. Provide query or recipients.'),
      sequenceId: z
        .string()
        .optional()
        .describe('Sequence ID from list_sequences to narrow the search.'),
      limit: z.number().optional().describe('Maximum results in one page, from 1 to 50.'),
      offset: z.number().optional().describe('Nonnegative paging offset.')
    })
  )
  .output(
    z.object({
      recipients: z.array(
        z.object({
          recipientId: z.string().optional(),
          sequenceId: z.string().optional(),
          userId: z.string().optional(),
          email: z.string(),
          name: z.string().optional(),
          state: z.string().optional()
        })
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).searchSequenceRecipients(ctx.input);
    return {
      output: {
        recipients: data.results.map(recipient => ({
          recipientId: recipient._id,
          sequenceId: recipient.sequenceId,
          userId: recipient.userId,
          email: recipient.email,
          name: recipient.name,
          state: recipient.state
        })),
        total: data.total
      },
      message: `Found ${data.results.length} sequence recipient(s).`
    };
  })
  .build();
