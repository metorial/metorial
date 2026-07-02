import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let getCourseTool = SlateTool.create(spec, {
  name: 'Get Course',
  key: 'get_course',
  description: `Retrieve detailed information about a single course by its ID. Includes course settings, syllabus body, term info, and total students when requested.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      includeSyllabus: z.boolean().optional().describe('Include the syllabus HTML body'),
      includeTerm: z.boolean().optional().describe('Include term details'),
      includeTotalStudents: z.boolean().optional().describe('Include total student count')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Canvas course ID'),
      name: z.string().describe('Course name'),
      courseCode: z.string().optional().describe('Course code'),
      workflowState: z.string().optional().describe('Course workflow state'),
      accountId: z.string().optional().describe('Account ID'),
      startAt: z.string().optional().nullable().describe('Course start date'),
      endAt: z.string().optional().nullable().describe('Course end date'),
      syllabusBody: z.string().optional().nullable().describe('Course syllabus HTML'),
      defaultView: z
        .string()
        .optional()
        .describe('Course homepage layout (feed, wiki, modules, assignments, syllabus)'),
      enrollmentTermId: z.string().optional().describe('Enrollment term ID'),
      totalStudents: z.number().optional().nullable().describe('Total enrolled students'),
      termName: z.string().optional().nullable().describe('Term name'),
      publicDescription: z.string().optional().nullable().describe('Public description'),
      timeZone: z.string().optional().describe('Course time zone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let include: string[] = [];
    if (ctx.input.includeSyllabus) include.push('syllabus_body');
    if (ctx.input.includeTerm) include.push('term');
    if (ctx.input.includeTotalStudents) include.push('total_students');

    let c = await client.getCourse(
      ctx.input.courseId,
      include.length > 0 ? include : undefined
    );

    return {
      output: {
        courseId: String(c.id),
        name: c.name,
        courseCode: c.course_code,
        workflowState: c.workflow_state,
        accountId: c.account_id ? String(c.account_id) : undefined,
        startAt: c.start_at,
        endAt: c.end_at,
        syllabusBody: c.syllabus_body,
        defaultView: c.default_view,
        enrollmentTermId: c.enrollment_term_id ? String(c.enrollment_term_id) : undefined,
        totalStudents: c.total_students,
        termName: c.term?.name,
        publicDescription: c.public_description,
        timeZone: c.time_zone
      },
      message: `Retrieved course **${c.name}** (${c.course_code}).`
    };
  })
  .build();
