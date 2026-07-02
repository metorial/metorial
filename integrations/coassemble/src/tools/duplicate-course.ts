import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateCourse = SlateTool.create(spec, {
  name: 'Duplicate Course',
  key: 'duplicate_course',
  description: `Create a copy of an existing Coassemble course. Optionally assign the duplicate to a different user or client.`
})
  .input(
    z.object({
      courseId: z.string().describe('ID of the course to duplicate'),
      identifier: z
        .string()
        .optional()
        .describe('Assign the duplicated course to this user identifier'),
      clientIdentifier: z
        .string()
        .optional()
        .describe('Assign the duplicated course to this client identifier')
    })
  )
  .output(
    z.object({
      course: z.record(z.string(), z.any()).describe('The duplicated course object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.duplicateCourse(ctx.input.courseId, {
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier
    });

    return {
      output: { course: result },
      message: `Duplicated course **${ctx.input.courseId}**${ctx.input.identifier ? ` and assigned to \`${ctx.input.identifier}\`` : ''}.`
    };
  })
  .build();
