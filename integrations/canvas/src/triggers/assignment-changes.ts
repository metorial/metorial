import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let assignmentChangesTrigger = SlateTrigger.create(spec, {
  name: 'Assignment Changes',
  key: 'assignment_changes',
  description:
    'Detects new or updated assignments across enrolled courses. Triggers when assignments are created, due dates change, or assignment settings are modified.'
})
  .input(
    z.object({
      assignmentId: z.string().describe('Assignment ID'),
      courseId: z.string().describe('Course ID'),
      name: z.string().describe('Assignment name'),
      dueAt: z.string().optional().nullable().describe('Due date'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      workflowState: z.string().optional().describe('published or unpublished'),
      changeType: z.enum(['new', 'updated']).describe('Type of change')
    })
  )
  .output(
    z.object({
      assignmentId: z.string().describe('Assignment ID'),
      courseId: z.string().describe('Course ID'),
      courseName: z.string().optional().describe('Course name'),
      name: z.string().describe('Assignment name'),
      dueAt: z.string().optional().nullable().describe('Due date'),
      pointsPossible: z.number().optional().nullable().describe('Maximum points'),
      gradingType: z.string().optional().describe('Grading type'),
      submissionTypes: z.array(z.string()).optional().describe('Submission types'),
      workflowState: z.string().optional().describe('Workflow state'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
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
      let knownAssignmentStates = (ctx.state?.knownAssignmentStates || {}) as Record<
        string,
        string
      >;

      let courses = await client.listCourses({
        enrollmentState: 'active'
      });

      let inputs: Array<{
        assignmentId: string;
        courseId: string;
        name: string;
        dueAt?: string | null;
        updatedAt?: string;
        workflowState?: string;
        changeType: 'new' | 'updated';
      }> = [];

      let newKnownStates: Record<string, string> = {};

      for (let course of courses.slice(0, 10)) {
        let assignments = await client.listAssignments(String(course.id));

        for (let assignment of assignments) {
          let assignmentId = String(assignment.id);
          let stateKey = `${assignment.workflow_state}|${assignment.updated_at || ''}|${assignment.due_at || ''}`;
          newKnownStates[assignmentId] = stateKey;

          if (!lastPollTime) continue;

          let previousState = knownAssignmentStates[assignmentId];

          if (!previousState) {
            inputs.push({
              assignmentId,
              courseId: String(course.id),
              name: assignment.name,
              dueAt: assignment.due_at,
              updatedAt: assignment.updated_at,
              workflowState: assignment.workflow_state,
              changeType: 'new'
            });
          } else if (previousState !== stateKey) {
            inputs.push({
              assignmentId,
              courseId: String(course.id),
              name: assignment.name,
              dueAt: assignment.due_at,
              updatedAt: assignment.updated_at,
              workflowState: assignment.workflow_state,
              changeType: 'updated'
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownAssignmentStates: newKnownStates
        }
      };
    },

    handleEvent: async ctx => {
      let client = new CanvasClient({
        token: ctx.auth.token,
        canvasDomain: ctx.auth.canvasDomain
      });

      let assignment: any = null;
      try {
        assignment = await client.getAssignment(ctx.input.courseId, ctx.input.assignmentId);
      } catch {
        // Assignment may have been deleted
      }

      return {
        type: `assignment.${ctx.input.changeType === 'new' ? 'created' : 'updated'}`,
        id: `assignment-${ctx.input.assignmentId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          assignmentId: ctx.input.assignmentId,
          courseId: ctx.input.courseId,
          name: assignment?.name || ctx.input.name,
          dueAt: assignment?.due_at ?? ctx.input.dueAt,
          pointsPossible: assignment?.points_possible,
          gradingType: assignment?.grading_type,
          submissionTypes: assignment?.submission_types,
          workflowState: assignment?.workflow_state || ctx.input.workflowState,
          updatedAt: assignment?.updated_at || ctx.input.updatedAt
        }
      };
    }
  })
  .build();
