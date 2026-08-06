import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let classroomApiErrorMessage = (error: unknown, fallback: string) => {
  let message = (error as { response?: { data?: { error?: { message?: string } } } })?.response
    ?.data?.error?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
};

export let deleteCourse = SlateTool.create(spec, {
  name: 'Delete Course',
  key: 'delete_course',
  description: `Delete a Google Classroom course. This permanently removes the course and all associated data. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleClassroomActionScopes.deleteCourse)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    try {
      await client.deleteCourse(ctx.input.courseId);
    } catch (error) {
      let message = classroomApiErrorMessage(error, 'Failed to delete course.');
      if (!message.includes('Precondition check failed')) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google Classroom',
          operation: 'delete course',
          reason: 'google_classroom_delete_course_api_error',
          nestedKeys: ['error', 'errors']
        });
      }

      try {
        await client.updateCourse(
          ctx.input.courseId,
          { courseState: 'ARCHIVED' },
          'courseState'
        );
      } catch (archiveError) {
        throw buildApiServiceError(archiveError, {
          providerLabel: 'Google Classroom',
          operation: 'archive course before deletion',
          reason: 'google_classroom_archive_course_api_error',
          nestedKeys: ['error', 'errors']
        });
      }

      try {
        await client.deleteCourse(ctx.input.courseId);
      } catch (deleteError) {
        throw buildApiServiceError(deleteError, {
          providerLabel: 'Google Classroom',
          operation: 'delete archived course',
          reason: 'google_classroom_delete_course_api_error',
          nestedKeys: ['error', 'errors']
        });
      }
    }

    return {
      output: { success: true },
      message: `Successfully deleted course \`${ctx.input.courseId}\`.`
    };
  })
  .build();
