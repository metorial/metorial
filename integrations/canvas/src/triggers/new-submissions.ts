import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let newSubmissionsTrigger = SlateTrigger.create(spec, {
  name: 'New Submissions',
  key: 'new_submissions',
  description:
    'Detects new or updated submissions for assignments in a specific course. Triggers when students submit work or when submissions are graded.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Submission ID'),
      assignmentId: z.string().describe('Assignment ID'),
      userId: z.string().describe('Submitting user ID'),
      submittedAt: z.string().optional().nullable().describe('Submission timestamp'),
      gradedAt: z.string().optional().nullable().describe('Grading timestamp'),
      workflowState: z.string().describe('Submission state'),
      changeType: z
        .enum(['submitted', 'graded', 'updated'])
        .describe('Type of change detected')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Submission ID'),
      assignmentId: z.string().describe('Assignment ID'),
      assignmentName: z.string().optional().describe('Assignment name'),
      userId: z.string().describe('Student user ID'),
      userName: z.string().optional().nullable().describe('Student name'),
      submittedAt: z.string().optional().nullable().describe('Submission timestamp'),
      grade: z.string().optional().nullable().describe('Assigned grade'),
      score: z.number().optional().nullable().describe('Numeric score'),
      late: z.boolean().optional().describe('Whether submitted late'),
      missing: z.boolean().optional().describe('Whether missing'),
      workflowState: z.string().optional().describe('Submission workflow state'),
      submissionType: z.string().optional().nullable().describe('Type of submission'),
      attempt: z.number().optional().nullable().describe('Attempt number')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CanvasClient({
        token: ctx.auth.token,
        canvasDomain: ctx.auth.canvasDomain
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownSubmissionStates = (ctx.state?.knownSubmissionStates || {}) as Record<
        string,
        string
      >;
      let courseId = ctx.state?.courseId as string | undefined;

      // Get courses the user teaches
      let courses = await client.listCourses({
        enrollmentType: 'teacher',
        enrollmentState: 'active'
      });

      let inputs: Array<{
        submissionId: string;
        assignmentId: string;
        userId: string;
        submittedAt?: string | null;
        gradedAt?: string | null;
        workflowState: string;
        changeType: 'submitted' | 'graded' | 'updated';
      }> = [];

      let newKnownStates: Record<string, string> = { ...knownSubmissionStates };

      // Process up to 5 courses to avoid timeouts
      let coursesToCheck = courses.slice(0, 5);

      for (let course of coursesToCheck) {
        let assignments = await client.listAssignments(String(course.id), { perPage: 20 });

        for (let assignment of assignments.slice(0, 10)) {
          let submissions = await client.listSubmissions(
            String(course.id),
            String(assignment.id),
            {
              include: ['user']
            }
          );

          for (let sub of submissions) {
            if (sub.workflow_state === 'unsubmitted' && !sub.grade) continue;

            let subId = String(sub.id);
            let stateKey = `${sub.workflow_state}|${sub.submitted_at || ''}|${sub.graded_at || ''}|${sub.attempt || 0}`;
            newKnownStates[subId] = stateKey;

            if (!lastPollTime) continue;

            let previousState = knownSubmissionStates[subId];
            if (previousState === stateKey) continue;

            let changeType: 'submitted' | 'graded' | 'updated' = 'updated';
            if (!previousState && sub.submitted_at) {
              changeType = 'submitted';
            } else if (sub.graded_at && !previousState?.includes(sub.graded_at)) {
              changeType = 'graded';
            }

            inputs.push({
              submissionId: subId,
              assignmentId: String(assignment.id),
              userId: String(sub.user_id),
              submittedAt: sub.submitted_at,
              gradedAt: sub.graded_at,
              workflowState: sub.workflow_state,
              changeType
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownSubmissionStates: newKnownStates,
          courseId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new CanvasClient({
        token: ctx.auth.token,
        canvasDomain: ctx.auth.canvasDomain
      });

      // Fetch the full submission with user details
      let submission = await client
        .getSubmission(
          '', // not needed with full submission id
          ctx.input.assignmentId,
          ctx.input.userId,
          ['user']
        )
        .catch(() => null);

      return {
        type: `submission.${ctx.input.changeType}`,
        id: `sub-${ctx.input.submissionId}-${ctx.input.changeType}-${ctx.input.submittedAt || ctx.input.gradedAt || Date.now()}`,
        output: {
          submissionId: ctx.input.submissionId,
          assignmentId: ctx.input.assignmentId,
          assignmentName: submission?.assignment?.name,
          userId: ctx.input.userId,
          userName: submission?.user?.name,
          submittedAt: ctx.input.submittedAt,
          grade: submission?.grade,
          score: submission?.score,
          late: submission?.late,
          missing: submission?.missing,
          workflowState: ctx.input.workflowState,
          submissionType: submission?.submission_type,
          attempt: submission?.attempt
        }
      };
    }
  })
  .build();
