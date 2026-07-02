import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let enrollmentChangesTrigger = SlateTrigger.create(spec, {
  name: 'Enrollment Changes',
  key: 'enrollment_changes',
  description:
    'Detects new or changed enrollments across courses. Triggers when students or instructors are enrolled, their enrollment state changes, or enrollments are removed.'
})
  .input(
    z.object({
      enrollmentId: z.string().describe('Enrollment ID'),
      courseId: z.string().describe('Course ID'),
      userId: z.string().describe('User ID'),
      enrollmentType: z.string().describe('Enrollment type'),
      enrollmentState: z.string().describe('Enrollment state'),
      changeType: z.enum(['new', 'updated', 'removed']).describe('Type of change')
    })
  )
  .output(
    z.object({
      enrollmentId: z.string().describe('Enrollment ID'),
      courseId: z.string().describe('Course ID'),
      courseName: z.string().optional().describe('Course name'),
      userId: z.string().describe('User ID'),
      userName: z.string().optional().describe('User name'),
      enrollmentType: z
        .string()
        .describe('Enrollment type (StudentEnrollment, TeacherEnrollment, etc.)'),
      enrollmentState: z
        .string()
        .describe('Enrollment state (active, invited, completed, inactive, deleted)'),
      courseSectionId: z.string().optional().describe('Section ID')
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
      let knownEnrollments = (ctx.state?.knownEnrollments || {}) as Record<string, string>;

      let courses = await client.listCourses({
        enrollmentState: 'active'
      });

      let inputs: Array<{
        enrollmentId: string;
        courseId: string;
        userId: string;
        enrollmentType: string;
        enrollmentState: string;
        changeType: 'new' | 'updated' | 'removed';
      }> = [];

      let newKnownEnrollments: Record<string, string> = {};

      // Check up to 10 courses
      for (let course of courses.slice(0, 10)) {
        let enrollments = await client.listEnrollments(String(course.id), {
          state: ['active', 'invited', 'completed', 'inactive']
        });

        for (let enrollment of enrollments) {
          let enrollmentId = String(enrollment.id);
          let stateKey = `${enrollment.enrollment_state}|${enrollment.updated_at || ''}`;
          newKnownEnrollments[enrollmentId] = stateKey;

          if (!lastPollTime) continue;

          let previousState = knownEnrollments[enrollmentId];

          if (!previousState) {
            inputs.push({
              enrollmentId,
              courseId: String(enrollment.course_id),
              userId: String(enrollment.user_id),
              enrollmentType: enrollment.type,
              enrollmentState: enrollment.enrollment_state,
              changeType: 'new'
            });
          } else if (previousState !== stateKey) {
            inputs.push({
              enrollmentId,
              courseId: String(enrollment.course_id),
              userId: String(enrollment.user_id),
              enrollmentType: enrollment.type,
              enrollmentState: enrollment.enrollment_state,
              changeType: 'updated'
            });
          }
        }
      }

      // Detect removed enrollments
      if (lastPollTime) {
        for (let enrollmentId of Object.keys(knownEnrollments)) {
          if (!newKnownEnrollments[enrollmentId]) {
            let _parts = (knownEnrollments[enrollmentId] || '').split('|');
            inputs.push({
              enrollmentId,
              courseId: '',
              userId: '',
              enrollmentType: '',
              enrollmentState: 'deleted',
              changeType: 'removed'
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownEnrollments: newKnownEnrollments
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `enrollment.${ctx.input.changeType === 'new' ? 'created' : ctx.input.changeType}`,
        id: `enrollment-${ctx.input.enrollmentId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          enrollmentId: ctx.input.enrollmentId,
          courseId: ctx.input.courseId,
          userId: ctx.input.userId,
          enrollmentType: ctx.input.enrollmentType,
          enrollmentState: ctx.input.enrollmentState
        }
      };
    }
  })
  .build();
