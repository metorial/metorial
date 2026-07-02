import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCourseLifecycle = SlateTool.create(spec, {
  name: 'Manage Course Lifecycle',
  key: 'manage_course_lifecycle',
  description: `Perform lifecycle actions on a Coassemble course: **publish**, **revert** to published version, **delete** (soft-delete), or **restore** a deleted course.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      action: z
        .enum(['publish', 'revert', 'delete', 'restore'])
        .describe('Lifecycle action to perform')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed successfully'),
      result: z.record(z.string(), z.any()).optional().describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result: any;

    switch (ctx.input.action) {
      case 'publish':
        result = await client.publishCourse(ctx.input.courseId);
        break;
      case 'revert':
        result = await client.revertCourse(ctx.input.courseId);
        break;
      case 'delete':
        result = await client.deleteCourse(ctx.input.courseId);
        break;
      case 'restore':
        result = await client.restoreCourse(ctx.input.courseId);
        break;
    }

    let actionLabels: Record<string, string> = {
      publish: 'Published',
      revert: 'Reverted',
      delete: 'Deleted',
      restore: 'Restored'
    };

    return {
      output: {
        success: true,
        result: result ?? undefined
      },
      message: `${actionLabels[ctx.input.action]} course **${ctx.input.courseId}**.`
    };
  })
  .build();
