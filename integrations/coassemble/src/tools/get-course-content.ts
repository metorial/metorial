import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCourseContent = SlateTool.create(spec, {
  name: 'Get Course Content',
  key: 'get_course_content',
  description:
    'Retrieve normalized course text, translation variants, and a catalog of media URLs and metadata for review or reuse.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course ID. Call list_courses to discover courses.'),
      identifier: z.string().optional().describe('Scope the course lookup to this user'),
      clientIdentifier: z
        .string()
        .optional()
        .describe('Scope the course lookup to this client')
    })
  )
  .output(
    z.object({
      content: z
        .record(z.string(), z.any())
        .describe('Course languages, text variants, and media asset catalog')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let content = await client.getCourseContent(ctx.input.courseId, {
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier
    });

    return {
      output: { content },
      message: `Retrieved content for course **${ctx.input.courseId}**.`
    };
  })
  .build();
