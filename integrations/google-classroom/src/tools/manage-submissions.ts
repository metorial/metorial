import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let submissionSchema = z.object({
  submissionId: z.string().optional().describe('ID of the submission'),
  courseId: z.string().optional().describe('Course ID'),
  courseWorkId: z.string().optional().describe('Coursework ID'),
  userId: z.string().optional().describe('Student user ID'),
  state: z
    .string()
    .optional()
    .describe('Submission state (NEW, CREATED, TURNED_IN, RETURNED, RECLAIMED_BY_STUDENT)'),
  assignedGrade: z.number().optional().describe('Assigned grade'),
  draftGrade: z.number().optional().describe('Draft grade'),
  late: z.boolean().optional().describe('Whether the submission is late'),
  alternateLink: z.string().optional().describe('URL to the submission'),
  creationTime: z.string().optional().describe('When the submission was created'),
  updateTime: z.string().optional().describe('When the submission was last updated')
});

export let manageSubmissions = SlateTool.create(spec, {
  name: 'Manage Submissions',
  key: 'manage_submissions',
  description: `List, grade, turn in, return, or reclaim student submissions for coursework in Google Classroom. Use this to view submission status, assign grades, and manage the submission lifecycle.`,
  instructions: [
    'Use action "list" to list submissions for a coursework item.',
    'Use action "grade" to assign a grade. Provide assignedGrade and/or draftGrade.',
    'Use action "turn_in" to submit work (as a student).',
    'Use action "return" to return a submission to the student (as a teacher).',
    'Use action "reclaim" to reclaim a turned-in submission (as a student).'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.manageSubmissions)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      courseWorkId: z.string().describe('ID of the coursework'),
      action: z
        .enum(['list', 'grade', 'turn_in', 'return', 'reclaim'])
        .describe('The submission action to perform'),
      submissionId: z
        .string()
        .optional()
        .describe('Submission ID (required for grade, turn_in, return, reclaim)'),
      userId: z.string().optional().describe('Filter submissions by user ID (for list)'),
      states: z
        .array(z.enum(['NEW', 'CREATED', 'TURNED_IN', 'RETURNED', 'RECLAIMED_BY_STUDENT']))
        .optional()
        .describe('Filter by submission states (for list)'),
      assignedGrade: z
        .number()
        .optional()
        .describe('Grade to assign to the submission (for grade)'),
      draftGrade: z
        .number()
        .optional()
        .describe('Draft grade to set on the submission (for grade)'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of submissions to return (for list)'),
      pageToken: z.string().optional().describe('Token for next page (for list)')
    })
  )
  .output(
    z.object({
      submissions: z.array(submissionSchema).optional().describe('List of submissions'),
      submission: submissionSchema.optional().describe('The updated submission'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, courseWorkId, action, submissionId } = ctx.input;

    if (action === 'list') {
      let result = await client.listStudentSubmissions(courseId, courseWorkId, {
        userId: ctx.input.userId,
        states: ctx.input.states,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });

      let submissions = (result.studentSubmissions || []).map((s: any) => ({
        submissionId: s.id,
        courseId: s.courseId,
        courseWorkId: s.courseWorkId,
        userId: s.userId,
        state: s.state,
        assignedGrade: s.assignedGrade,
        draftGrade: s.draftGrade,
        late: s.late,
        alternateLink: s.alternateLink,
        creationTime: s.creationTime,
        updateTime: s.updateTime
      }));

      return {
        output: { submissions, nextPageToken: result.nextPageToken, success: true },
        message: `Found **${submissions.length}** submission(s).`
      };
    }

    if (!submissionId) throw new Error('submissionId is required for this action');

    if (action === 'grade') {
      let updateFields: Record<string, any> = {};
      let maskParts: string[] = [];

      if (ctx.input.assignedGrade !== undefined) {
        updateFields.assignedGrade = ctx.input.assignedGrade;
        maskParts.push('assignedGrade');
      }
      if (ctx.input.draftGrade !== undefined) {
        updateFields.draftGrade = ctx.input.draftGrade;
        maskParts.push('draftGrade');
      }

      let result = await client.patchStudentSubmission(
        courseId,
        courseWorkId,
        submissionId,
        updateFields,
        maskParts.join(',')
      );

      return {
        output: {
          submission: {
            submissionId: result.id,
            courseId: result.courseId,
            courseWorkId: result.courseWorkId,
            userId: result.userId,
            state: result.state,
            assignedGrade: result.assignedGrade,
            draftGrade: result.draftGrade,
            late: result.late,
            alternateLink: result.alternateLink
          },
          success: true
        },
        message: `Graded submission \`${submissionId}\`. Assigned: ${ctx.input.assignedGrade ?? 'N/A'}, Draft: ${ctx.input.draftGrade ?? 'N/A'}.`
      };
    }

    if (action === 'turn_in') {
      await client.turnInStudentSubmission(courseId, courseWorkId, submissionId);
      return {
        output: { success: true },
        message: `Turned in submission \`${submissionId}\`.`
      };
    }

    if (action === 'return') {
      await client.returnStudentSubmission(courseId, courseWorkId, submissionId);
      return {
        output: { success: true },
        message: `Returned submission \`${submissionId}\` to the student.`
      };
    }

    if (action === 'reclaim') {
      await client.reclaimStudentSubmission(courseId, courseWorkId, submissionId);
      return {
        output: { success: true },
        message: `Reclaimed submission \`${submissionId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
