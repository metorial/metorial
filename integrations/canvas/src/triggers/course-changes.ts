import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let courseChangesTrigger = SlateTrigger.create(spec, {
  name: 'Course Changes',
  key: 'course_changes',
  description:
    'Detects new or updated courses by polling the courses API. Triggers when courses are created, updated, or change state.'
})
  .input(
    z.object({
      courseId: z.string().describe('Course ID'),
      courseName: z.string().describe('Course name'),
      courseCode: z.string().optional().describe('Course code'),
      workflowState: z.string().optional().describe('Workflow state'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      changeType: z
        .enum(['new', 'updated'])
        .describe('Whether this is a newly detected course or an updated one')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Course ID'),
      courseName: z.string().describe('Course name'),
      courseCode: z.string().optional().describe('Course code'),
      workflowState: z.string().optional().describe('Current workflow state'),
      startAt: z.string().optional().nullable().describe('Course start date'),
      endAt: z.string().optional().nullable().describe('Course end date'),
      updatedAt: z.string().optional().describe('Last update timestamp')
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
      let knownCourseStates = (ctx.state?.knownCourseStates || {}) as Record<string, string>;

      let courses = await client.listCourses({
        include: ['term']
      });

      let inputs: Array<{
        courseId: string;
        courseName: string;
        courseCode?: string;
        workflowState?: string;
        updatedAt?: string;
        changeType: 'new' | 'updated';
      }> = [];

      let newKnownStates: Record<string, string> = {};

      for (let course of courses) {
        let courseId = String(course.id);
        let stateKey = `${course.workflow_state}|${course.updated_at || ''}`;
        newKnownStates[courseId] = stateKey;

        if (!lastPollTime) continue;

        let previousState = knownCourseStates[courseId];

        if (!previousState) {
          inputs.push({
            courseId,
            courseName: course.name,
            courseCode: course.course_code,
            workflowState: course.workflow_state,
            updatedAt: course.updated_at,
            changeType: 'new'
          });
        } else if (previousState !== stateKey) {
          inputs.push({
            courseId,
            courseName: course.name,
            courseCode: course.course_code,
            workflowState: course.workflow_state,
            updatedAt: course.updated_at,
            changeType: 'updated'
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownCourseStates: newKnownStates
        }
      };
    },

    handleEvent: async ctx => {
      let client = new CanvasClient({
        token: ctx.auth.token,
        canvasDomain: ctx.auth.canvasDomain
      });

      let course = await client.getCourse(ctx.input.courseId);

      return {
        type: `course.${ctx.input.changeType === 'new' ? 'created' : 'updated'}`,
        id: `course-${ctx.input.courseId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          courseId: String(course.id),
          courseName: course.name,
          courseCode: course.course_code,
          workflowState: course.workflow_state,
          startAt: course.start_at,
          endAt: course.end_at,
          updatedAt: course.updated_at
        }
      };
    }
  })
  .build();
