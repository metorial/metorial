import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listCoursesTool = SlateTool.create(spec, {
  name: 'List Courses',
  key: 'list_courses',
  description: `Retrieve courses accessible to the authenticated user. Can filter by enrollment type, enrollment state, and search term. Returns course details including name, code, term, and workflow state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      enrollmentType: z
        .enum(['teacher', 'student', 'ta', 'observer', 'designer'])
        .optional()
        .describe('Filter by enrollment role in the course'),
      enrollmentState: z
        .enum(['active', 'invited_or_pending', 'completed'])
        .optional()
        .describe('Filter by enrollment state'),
      state: z
        .array(z.enum(['unpublished', 'available', 'completed', 'deleted']))
        .optional()
        .describe('Filter by course workflow state (admin only)'),
      searchTerm: z
        .string()
        .optional()
        .describe('Partial course name, code, or full ID to search for'),
      includeTerms: z
        .boolean()
        .optional()
        .describe('Include term information for each course'),
      includeTotalStudents: z.boolean().optional().describe('Include total student count')
    })
  )
  .output(
    z.object({
      courses: z.array(
        z.object({
          courseId: z.string().describe('Canvas course ID'),
          name: z.string().describe('Course name'),
          courseCode: z.string().optional().describe('Course code'),
          workflowState: z
            .string()
            .optional()
            .describe('Course state (unpublished, available, completed, deleted)'),
          startAt: z.string().optional().nullable().describe('Course start date'),
          endAt: z.string().optional().nullable().describe('Course end date'),
          enrollmentTermId: z.string().optional().describe('Term ID'),
          totalStudents: z.number().optional().nullable().describe('Number of students'),
          termName: z.string().optional().nullable().describe('Term name if included')
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
    if (ctx.input.includeTerms) include.push('term');
    if (ctx.input.includeTotalStudents) include.push('total_students');

    let raw = await client.listCourses({
      enrollmentType: ctx.input.enrollmentType,
      enrollmentState: ctx.input.enrollmentState,
      state: ctx.input.state,
      searchTerm: ctx.input.searchTerm,
      include: include.length > 0 ? include : undefined
    });

    let courses = raw.map((c: any) => ({
      courseId: String(c.id),
      name: c.name,
      courseCode: c.course_code,
      workflowState: c.workflow_state,
      startAt: c.start_at,
      endAt: c.end_at,
      enrollmentTermId: c.enrollment_term_id ? String(c.enrollment_term_id) : undefined,
      totalStudents: c.total_students,
      termName: c.term?.name
    }));

    return {
      output: { courses },
      message: `Found **${courses.length}** course(s).`
    };
  })
  .build();
