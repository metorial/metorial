import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCourse = SlateTool.create(spec, {
  name: 'Get Course',
  key: 'get_course',
  description: `Retrieve detailed information about a specific Coassemble course by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The ID of the course to retrieve')
    })
  )
  .output(
    z.object({
      course: z.record(z.string(), z.any()).describe('The course object with all its details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let course = await client.getCourse(ctx.input.courseId);

    return {
      output: { course },
      message: `Retrieved course **${course?.title ?? ctx.input.courseId}**.`
    };
  })
  .build();
