import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCourseProgressTool = SlateTool.create(spec, {
  name: 'Get Course Progress',
  key: 'get_course_progress',
  description: `Retrieve course progress for a user. When a course ID is provided, returns detailed progress for that specific course. Otherwise, returns one page of course progress. Call list_courses to discover course IDs; pass lastLoadedCourseId to continue listing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user'),
      lastLoadedCourseId: z
        .string()
        .optional()
        .describe('Course cursor for listing; omitted when requesting a specific course'),
      pageLength: z
        .number()
        .optional()
        .describe('Courses per page when listing, from 1 to 100'),
      courseId: z
        .string()
        .optional()
        .describe(
          'Course ID from list_courses. If omitted, returns one page of progress, including its nextPage cursor.'
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

    let progress: unknown;
    if (ctx.input.courseId) {
      progress = await client.getCourseProgress(ctx.input.courseId, ctx.input.email);
    } else {
      progress = await client.listCourseProgress(ctx.input.email, {
        lastLoadedCourseId: ctx.input.lastLoadedCourseId,
        pageLength: ctx.input.pageLength
      });
    }

    let scope = ctx.input.courseId ? `course **${ctx.input.courseId}**` : 'a page of courses';

    return {
      output: { progress },
      message: `Retrieved progress for **${ctx.input.email}** across ${scope}.`
    };
  })
  .build();
