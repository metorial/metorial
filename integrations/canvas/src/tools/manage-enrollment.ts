import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnrollmentTool = SlateTool.create(spec, {
  name: 'Manage Enrollment',
  key: 'manage_enrollment',
  description: `Enroll a user in a course or remove an enrollment. Supports various roles (student, teacher, TA, observer, designer) and enrollment states. Can also conclude, deactivate, or delete existing enrollments.`,
  instructions: [
    'To enroll a user, set action to "enroll" and provide userId and enrollmentRole.',
    'To remove an enrollment, set action to "conclude", "delete", or "deactivate" and provide the enrollmentId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      action: z
        .enum(['enroll', 'conclude', 'delete', 'deactivate'])
        .describe('Action to perform'),
      userId: z.string().optional().describe('User ID to enroll (required for enroll action)'),
      enrollmentId: z
        .string()
        .optional()
        .describe('Enrollment ID (required for conclude/delete/deactivate)'),
      enrollmentRole: z
        .enum([
          'StudentEnrollment',
          'TeacherEnrollment',
          'TaEnrollment',
          'ObserverEnrollment',
          'DesignerEnrollment'
        ])
        .optional()
        .describe('Enrollment role type (required for enroll)'),
      courseSectionId: z.string().optional().describe('Specific section to enroll into'),
      enrollmentState: z
        .enum(['active', 'invited', 'inactive'])
        .optional()
        .describe('Initial enrollment state'),
      notify: z.boolean().optional().describe('Send enrollment notification email')
    })
  )
  .output(
    z.object({
      enrollmentId: z.string().describe('Enrollment ID'),
      courseId: z.string().describe('Course ID'),
      userId: z.string().describe('User ID'),
      enrollmentType: z.string().describe('Enrollment role type'),
      enrollmentState: z.string().describe('Current enrollment state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'enroll') {
      if (!ctx.input.userId) throw new Error('userId is required for enroll action');
      if (!ctx.input.enrollmentRole)
        throw new Error('enrollmentRole is required for enroll action');

      result = await client.enrollUser(ctx.input.courseId, {
        userId: ctx.input.userId,
        type: ctx.input.enrollmentRole,
        enrollmentState: ctx.input.enrollmentState,
        courseSectionId: ctx.input.courseSectionId,
        notify: ctx.input.notify
      });
      actionDesc = 'Enrolled user';
    } else {
      if (!ctx.input.enrollmentId)
        throw new Error('enrollmentId is required for conclude/delete/deactivate');
      let task =
        ctx.input.action === 'deactivate'
          ? ('deactivate' as const)
          : (ctx.input.action as 'conclude' | 'delete');
      result = await client.deleteEnrollment(ctx.input.courseId, ctx.input.enrollmentId, task);
      actionDesc = `${ctx.input.action.charAt(0).toUpperCase() + ctx.input.action.slice(1)}d enrollment`;
    }

    return {
      output: {
        enrollmentId: String(result.id),
        courseId: String(result.course_id),
        userId: String(result.user_id),
        enrollmentType: result.type,
        enrollmentState: result.enrollment_state
      },
      message: `${actionDesc} (ID: ${result.id}) in course ${result.course_id}.`
    };
  })
  .build();
