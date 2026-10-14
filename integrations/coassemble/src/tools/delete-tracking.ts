import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTracking = SlateTool.create(spec, {
  name: 'Delete Tracking',
  key: 'delete_tracking',
  description: `Soft-delete a learner's tracking for a course. Outcome records remain for reporting, while hosted SCORM resume state and runtime logs are permanently removed and the learner can no longer launch or resume the course.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('Course ID of the tracking to delete'),
      identifier: z.string().describe('Learner identifier whose tracking to delete'),
      clientIdentifier: z
        .string()
        .optional()
        .describe('Restrict deletion to the learner in this client/tenant')
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

    let result = await client.deleteTracking(
      ctx.input.courseId,
      ctx.input.identifier,
      ctx.input.clientIdentifier
    );
    let success = result !== false;

    return {
      output: { success },
      message: success
        ? `Deleted tracking for learner \`${ctx.input.identifier}\` on course **${ctx.input.courseId}**.`
        : `Coassemble did not delete tracking for learner \`${ctx.input.identifier}\` on course **${ctx.input.courseId}**.`
    };
  })
  .build();
