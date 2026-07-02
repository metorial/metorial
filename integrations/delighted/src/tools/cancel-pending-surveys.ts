import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelPendingSurveys = SlateTool.create(spec, {
  name: 'Cancel Pending Surveys',
  key: 'cancel_pending_surveys',
  description: `Cancel all pending (not yet sent) survey requests for a specific person. Useful for preventing scheduled surveys from being dispatched.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z
        .string()
        .describe('Email address of the person whose pending surveys should be cancelled')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deletePendingSurveyRequests(ctx.input.email);

    return {
      output: { ok: result.ok },
      message: `Pending survey requests for **${ctx.input.email}** cancelled.`
    };
  })
  .build();
