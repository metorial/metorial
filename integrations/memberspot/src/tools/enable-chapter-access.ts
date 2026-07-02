import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enableChapterAccessTool = SlateTool.create(spec, {
  name: 'Enable Chapter Access',
  key: 'enable_chapter_access',
  description: `Enable access to a specific chapter within a course for a user. Allows fine-grained content gating beyond full course-level access, such as drip-feeding content or unlocking bonus chapters.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user'),
      courseId: z.string().describe('ID of the course containing the chapter'),
      chapterId: z.string().describe('ID of the chapter to enable access to')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Result of the chapter access enablement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.enableChapterAccess({
      email: ctx.input.email,
      courseId: ctx.input.courseId,
      chapterId: ctx.input.chapterId
    });

    return {
      output: { result },
      message: `Enabled chapter **${ctx.input.chapterId}** access for **${ctx.input.email}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();
