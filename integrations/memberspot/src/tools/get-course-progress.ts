import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCourseProgressTool = SlateTool.create(spec, {
  name: 'Get Course Progress',
  key: 'get_course_progress',
  description: `Retrieve course progress for a user. When a course ID is provided, returns detailed progress for that specific course. Otherwise, returns progress across all enrolled courses for the user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user'),
      courseId: z
        .string()
        .optional()
        .describe(
          'Specific course ID to get progress for. If omitted, returns progress for all courses.'
        )
    })
  )
  .output(
    z.object({
      progress: z.any().describe('Course progress data for the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let progress: any;
    if (ctx.input.courseId) {
      progress = await client.getCourseProgress(ctx.input.courseId, ctx.input.email);
    } else {
      progress = await client.listCourseProgress(ctx.input.email);
    }

    let scope = ctx.input.courseId ? `course **${ctx.input.courseId}**` : 'all courses';

    return {
      output: { progress },
      message: `Retrieved progress for **${ctx.input.email}** across ${scope}.`
    };
  })
  .build();
