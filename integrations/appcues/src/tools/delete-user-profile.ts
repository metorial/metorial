import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUserProfile = SlateTool.create(spec, {
  name: 'Delete User Profile',
  key: 'delete_user_profile',
  description: `Delete an end-user's profile from Appcues. This resets their experience state (re-enables one-time flows, resets checklist progress) but does **not** remove analytics data. The operation is processed asynchronously.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Does not remove analytics data — only resets experience state',
    'Operation is processed asynchronously'
  ]
})
  .input(
    z.object({
      userId: z.string().describe('The unique identifier of the user to delete')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID that was deleted'),
      jobId: z.string().optional().describe('Async job ID for tracking the deletion'),
      jobUrl: z.string().optional().describe('URL for tracking the job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let result = await client.deleteUserProfile(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        jobId: result?.job_id || undefined,
        jobUrl: result?.job_url || undefined
      },
      message: `Initiated deletion of user profile \`${ctx.input.userId}\`. ${result?.job_id ? `Job ID: \`${result.job_id}\`` : ''}`
    };
  })
  .build();
