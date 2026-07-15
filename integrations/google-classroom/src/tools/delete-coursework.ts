import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteCoursework = SlateTool.create(spec, {
  name: 'Delete Coursework',
  key: 'delete_coursework',
  description:
    'Delete coursework created by the same Google OAuth developer project. This action cannot be undone.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleClassroomActionScopes.deleteCoursework)
  .input(
    z.object({
      courseId: z.string().describe('ID or alias of the course containing the coursework'),
      courseWorkId: z.string().describe('Classroom-assigned ID of the coursework to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the coursework was deleted'),
      courseId: z.string().describe('ID or alias of the course'),
      courseWorkId: z.string().describe('ID of the deleted coursework')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new ClassroomClient({ token: ctx.auth.token });
      await client.deleteCourseWork(ctx.input.courseId, ctx.input.courseWorkId);

      return {
        output: {
          success: true,
          courseId: ctx.input.courseId,
          courseWorkId: ctx.input.courseWorkId
        },
        message: `Deleted coursework \`${ctx.input.courseWorkId}\` from course \`${ctx.input.courseId}\`.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Classroom',
        operation: 'delete coursework',
        reason: 'google_classroom_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
