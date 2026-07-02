import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listEnrollmentsTool = SlateTool.create(spec, {
  name: 'List Enrollments',
  key: 'list_enrollments',
  description: `List all enrollments in a course. Includes enrollment type, state, user info, and optionally grades. Can filter by role type and enrollment state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      enrollmentType: z
        .array(
          z.enum([
            'StudentEnrollment',
            'TeacherEnrollment',
            'TaEnrollment',
            'ObserverEnrollment',
            'DesignerEnrollment'
          ])
        )
        .optional()
        .describe('Filter by enrollment role type'),
      enrollmentState: z
        .array(
          z.enum([
            'active',
            'invited',
            'creation_pending',
            'deleted',
            'rejected',
            'completed',
            'inactive'
          ])
        )
        .optional()
        .describe('Filter by enrollment state'),
      includeGrades: z.boolean().optional().describe('Include current grade and score')
    })
  )
  .output(
    z.object({
      enrollments: z.array(
        z.object({
          enrollmentId: z.string().describe('Enrollment ID'),
          courseId: z.string().describe('Course ID'),
          userId: z.string().describe('User ID'),
          userName: z.string().optional().describe('User name'),
          enrollmentType: z.string().describe('Enrollment role type'),
          enrollmentState: z.string().describe('Enrollment state'),
          courseSectionId: z.string().optional().describe('Section ID'),
          currentGrade: z.string().optional().nullable().describe('Current letter grade'),
          currentScore: z.number().optional().nullable().describe('Current score percentage'),
          finalGrade: z.string().optional().nullable().describe('Final letter grade'),
          finalScore: z.number().optional().nullable().describe('Final score percentage')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let include: string[] = [];
    if (ctx.input.includeGrades) include.push('current_points', 'total_scores');

    let raw = await client.listEnrollments(ctx.input.courseId, {
      type: ctx.input.enrollmentType,
      state: ctx.input.enrollmentState,
      include: include.length > 0 ? include : undefined
    });

    let enrollments = raw.map((e: any) => ({
      enrollmentId: String(e.id),
      courseId: String(e.course_id),
      userId: String(e.user_id),
      userName: e.user?.name,
      enrollmentType: e.type,
      enrollmentState: e.enrollment_state,
      courseSectionId: e.course_section_id ? String(e.course_section_id) : undefined,
      currentGrade: e.grades?.current_grade,
      currentScore: e.grades?.current_score,
      finalGrade: e.grades?.final_grade,
      finalScore: e.grades?.final_score
    }));

    return {
      output: { enrollments },
      message: `Found **${enrollments.length}** enrollment(s) in course ${ctx.input.courseId}.`
    };
  })
  .build();
