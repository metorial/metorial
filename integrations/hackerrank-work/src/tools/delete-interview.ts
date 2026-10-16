import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let deleteInterview = SlateTool.create(spec, {
  key: 'delete_interview',
  name: 'Delete Interview',
  description: 'Delete an existing live coding interview.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      interviewId: z.string().describe('Interview ID from list_interviews')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether HackerRank accepted deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteInterview(ctx.input.interviewId);
    return { output: { deleted: true }, message: 'Deleted the interview.' };
  });
