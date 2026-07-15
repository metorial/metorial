import { buildApiServiceError, createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let courseWorkUpdateFieldSchema = z.enum([
  'title',
  'description',
  'state',
  'dueDate',
  'dueTime',
  'maxPoints',
  'scheduledTime',
  'submissionModificationMode',
  'topicId',
  'gradingPeriodId'
]);

let dueDateSchema = z.object({
  year: z.number().int().min(1).describe('Four-digit due-date year'),
  month: z.number().int().min(1).max(12).describe('Due-date month from 1 to 12'),
  day: z.number().int().min(1).max(31).describe('Due-date day from 1 to 31')
});

let dueTimeSchema = z.object({
  hours: z.number().int().min(0).max(23).optional().describe('Due-time hour from 0 to 23'),
  minutes: z.number().int().min(0).max(59).optional().describe('Due-time minute from 0 to 59'),
  seconds: z.number().int().min(0).max(59).optional().describe('Due-time second from 0 to 59'),
  nanos: z
    .number()
    .int()
    .min(0)
    .max(999_999_999)
    .optional()
    .describe('Nanosecond fraction of the due time')
});

export let updateCoursework = SlateTool.create(spec, {
  name: 'Update Coursework',
  key: 'update_coursework',
  description:
    'Update selected teacher-editable fields on coursework created by the same Google OAuth developer project.',
  instructions: [
    'List every field to change or clear in updateMask. Fields provided outside updateMask are rejected to avoid silently ignored updates.',
    'To clear a field that Google allows to be empty, include it in updateMask and omit its value. Title cannot be cleared; gradingPeriodId uses an empty string for no grading-period association.',
    'Updating dueDate can cause Google to recalculate gradingPeriodId. To preserve a custom or empty grading-period association, include gradingPeriodId in updateMask and provide its current ID or an empty string.',
    'dueDate and dueTime must change together: include both in updateMask and either provide both values to set the due date or omit both values to clear it.',
    'Changing which students receive the coursework (assignee mode and individual students) is not supported by this integration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleClassroomActionScopes.updateCoursework)
  .input(
    z.object({
      courseId: z.string().describe('ID or alias of the course containing the coursework'),
      courseWorkId: z.string().describe('Classroom-assigned ID of the coursework to update'),
      updateMask: z
        .array(courseWorkUpdateFieldSchema)
        .min(1)
        .describe(
          'Fields to update or clear. Google applies only these fields; duplicate entries are ignored.'
        ),
      title: z.string().min(1).max(3000).optional().describe('New coursework title'),
      description: z
        .string()
        .max(30000)
        .optional()
        .describe('New coursework description; use an empty string to clear it'),
      state: z
        .enum(['PUBLISHED', 'DRAFT'])
        .optional()
        .describe('New publication state for the coursework'),
      dueDate: dueDateSchema.optional().describe('New due date in UTC'),
      dueTime: dueTimeSchema.optional().describe('New due time in UTC'),
      maxPoints: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('New non-negative integer maximum point value for the coursework'),
      scheduledTime: z
        .string()
        .optional()
        .describe('RFC 3339 timestamp when draft coursework should be published'),
      submissionModificationMode: z
        .enum(['MODIFIABLE_UNTIL_TURNED_IN', 'MODIFIABLE'])
        .optional()
        .describe('When students may modify their submissions'),
      topicId: z
        .string()
        .optional()
        .describe(
          'Topic ID to associate; to clear it, include topicId in updateMask and omit this value'
        ),
      gradingPeriodId: z
        .string()
        .optional()
        .describe('Grading period ID to associate, or an empty string for no grading period')
    })
  )
  .output(
    z.object({
      courseWorkId: z.string().describe('ID of the updated coursework'),
      courseId: z.string().describe('ID of the course containing the coursework'),
      title: z.string().optional().describe('Updated coursework title'),
      description: z.string().optional().describe('Updated coursework description'),
      state: z.string().optional().describe('Updated publication state'),
      dueDate: dueDateSchema.optional().describe('Updated due date'),
      dueTime: dueTimeSchema.optional().describe('Updated due time'),
      maxPoints: z.number().int().optional().describe('Updated maximum point value'),
      scheduledTime: z.string().optional().describe('Updated scheduled publication time'),
      submissionModificationMode: z
        .string()
        .optional()
        .describe('Updated submission modification mode'),
      topicId: z.string().optional().describe('Updated topic ID'),
      gradingPeriodId: z.string().optional().describe('Updated grading period ID'),
      alternateLink: z.string().optional().describe('URL to view the coursework in Classroom'),
      updateTime: z.string().optional().describe('Timestamp of the latest update'),
      updatedFields: z.array(courseWorkUpdateFieldSchema).describe('Fields sent in updateMask')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let updateMask = [...new Set(ctx.input.updateMask)];
      let updateValues = pickDefined({
        title: ctx.input.title,
        description: ctx.input.description,
        state: ctx.input.state,
        dueDate: ctx.input.dueDate,
        dueTime: ctx.input.dueTime,
        maxPoints: ctx.input.maxPoints,
        scheduledTime: ctx.input.scheduledTime,
        submissionModificationMode: ctx.input.submissionModificationMode,
        topicId: ctx.input.topicId,
        gradingPeriodId: ctx.input.gradingPeriodId
      });
      let unmaskedFields = Object.keys(updateValues).filter(
        field => !updateMask.includes(field as z.infer<typeof courseWorkUpdateFieldSchema>)
      );

      if (unmaskedFields.length > 0) {
        throw createApiServiceError(
          `Add these provided fields to updateMask: ${unmaskedFields.join(', ')}.`,
          { reason: 'google_classroom_invalid_update_mask' }
        );
      }

      if (updateMask.includes('title') && ctx.input.title === undefined) {
        throw createApiServiceError('title is required when updateMask includes title.', {
          reason: 'google_classroom_invalid_update_mask'
        });
      }

      let masksDueDate = updateMask.includes('dueDate');
      let masksDueTime = updateMask.includes('dueTime');
      if (
        masksDueDate !== masksDueTime ||
        (masksDueDate &&
          (ctx.input.dueDate === undefined) !== (ctx.input.dueTime === undefined))
      ) {
        throw createApiServiceError(
          'Google Classroom requires dueDate and dueTime to change together. Include both dueDate and dueTime in updateMask, then either provide both values to set the due date or omit both values to clear it.',
          { reason: 'google_classroom_invalid_update_mask' }
        );
      }

      let courseWork = Object.fromEntries(
        Object.entries(updateValues).filter(([field]) =>
          updateMask.includes(field as z.infer<typeof courseWorkUpdateFieldSchema>)
        )
      );
      let client = new ClassroomClient({ token: ctx.auth.token });
      let result = await client.updateCourseWork(
        ctx.input.courseId,
        ctx.input.courseWorkId,
        courseWork,
        updateMask.join(',')
      );

      return {
        output: {
          courseWorkId: result.id ?? ctx.input.courseWorkId,
          courseId: result.courseId ?? ctx.input.courseId,
          title: result.title,
          description: result.description,
          state: result.state,
          dueDate: result.dueDate,
          dueTime: result.dueTime,
          maxPoints: result.maxPoints,
          scheduledTime: result.scheduledTime,
          submissionModificationMode: result.submissionModificationMode,
          topicId: result.topicId,
          gradingPeriodId: result.gradingPeriodId,
          alternateLink: result.alternateLink,
          updateTime: result.updateTime,
          updatedFields: updateMask
        },
        message: `Updated coursework **${result.title ?? ctx.input.courseWorkId}**. Fields changed: ${updateMask.join(', ')}.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Classroom',
        operation: 'update coursework',
        reason: 'google_classroom_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
