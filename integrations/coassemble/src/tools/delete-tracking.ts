import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTracking = SlateTool.create(spec, {
  name: 'Delete Tracking',
  key: 'delete_tracking',
  description: `Delete a learner's tracking record for a specific course. This removes progress data for the given learner and course combination.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('Course ID of the tracking to delete'),
      identifier: z.string().describe('Learner identifier whose tracking to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tracking was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    await client.deleteTracking(ctx.input.courseId, ctx.input.identifier);

    return {
      output: { success: true },
      message: `Deleted tracking for learner \`${ctx.input.identifier}\` on course **${ctx.input.courseId}**.`
    };
  })
  .build();
