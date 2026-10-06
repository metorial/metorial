import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { threadSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getAskThread = SlateTool.create(spec, {
  name: 'Get Ask Thread',
  key: 'get_ask_thread',
  description:
    'Read an existing Ask conversation or poll the threadId returned by ask_question. Preserve processing, failed, and needs-approval states. This operation neither submits a new question nor approves drafted changes. Source IDs in rounds are citation IDs, not note IDs.',
  instructions: [
    'When processing, wait the returned retryAfterSeconds before reading the same thread again.',
    'A needs-approval result requires human review; reading a thread does not approve changes.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      threadId: z
        .string()
        .describe('Exact thread ID returned by ask_question or a previous conversation.')
    })
  )
  .output(threadSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth.token).getAskThread(ctx.input.threadId);
    return { output, message: `Read the existing Ask thread: ${output.status}.` };
  })
  .build();
