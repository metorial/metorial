import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageCourseTool = SlateTool.create(spec, {
  name: 'Manage Course',
  key: 'manage_course',
  description: `Create, update, or delete a course. For creating, provide an accountId and course details. For updating, provide a courseId and the fields to change. For deleting/concluding, specify the action.`,
  instructions: [
    'To create a course, provide "accountId" and the course fields. The "courseId" should not be set.',
    'To update a course, provide "courseId" and the fields to change.',
    'To delete or conclude a course, provide "courseId" and set "action" to "delete" or "conclude".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().optional().describe('Course ID (required for update/delete)'),
      accountId: z
        .string()
        .optional()
        .describe('Account ID (required for creating a new course)'),
      action: z.enum(['create', 'update', 'delete', 'conclude']).describe('Action to perform'),
      name: z.string().optional().describe('Course name'),
      courseCode: z.string().optional().describe('Course code / short name'),
      startAt: z.string().optional().describe('Course start date (ISO 8601)'),
      endAt: z.string().optional().describe('Course end date (ISO 8601)'),
      license: z.string().optional().describe('Content license (e.g., private, cc_by_nc_nd)'),
      isPublic: z.boolean().optional().describe('Whether course is publicly visible'),
      isPublicToAuthUsers: z
        .boolean()
        .optional()
        .describe('Whether course is visible to authenticated users'),
      publicSyllabus: z.boolean().optional().describe('Whether syllabus is public'),
      publicDescription: z.string().optional().describe('Public description'),
      allowStudentWikiEdits: z
        .boolean()
        .optional()
        .describe('Allow students to edit wiki pages'),
      allowWikiComments: z.boolean().optional().describe('Allow comments on wiki pages'),
      allowStudentForumAttachments: z
        .boolean()
        .optional()
        .describe('Allow file attachments in discussions'),
      defaultView: z
        .enum(['feed', 'wiki', 'modules', 'assignments', 'syllabus'])
        .optional()
        .describe('Course homepage layout'),
      syllabusBody: z.string().optional().describe('Syllabus HTML content'),
      termId: z.string().optional().describe('Enrollment term ID'),
      restrictEnrollmentsToCourseDates: z
        .boolean()
        .optional()
        .describe('Restrict enrollment to course dates')
    })
  )
  .output(
    z.object({
      courseId: z.string().describe('Canvas course ID'),
      name: z.string().describe('Course name'),
      courseCode: z.string().optional().describe('Course code'),
      workflowState: z.string().optional().describe('Course workflow state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let courseData: Record<string, any> = {};
    if (ctx.input.name) courseData.name = ctx.input.name;
    if (ctx.input.courseCode) courseData.course_code = ctx.input.courseCode;
    if (ctx.input.startAt) courseData.start_at = ctx.input.startAt;
    if (ctx.input.endAt) courseData.end_at = ctx.input.endAt;
    if (ctx.input.license) courseData.license = ctx.input.license;
    if (ctx.input.isPublic !== undefined) courseData.is_public = ctx.input.isPublic;
    if (ctx.input.isPublicToAuthUsers !== undefined)
      courseData.is_public_to_auth_users = ctx.input.isPublicToAuthUsers;
    if (ctx.input.publicSyllabus !== undefined)
      courseData.public_syllabus = ctx.input.publicSyllabus;
    if (ctx.input.publicDescription)
      courseData.public_description = ctx.input.publicDescription;
    if (ctx.input.allowStudentWikiEdits !== undefined)
      courseData.allow_student_wiki_edits = ctx.input.allowStudentWikiEdits;
    if (ctx.input.allowWikiComments !== undefined)
      courseData.allow_wiki_comments = ctx.input.allowWikiComments;
    if (ctx.input.allowStudentForumAttachments !== undefined)
      courseData.allow_student_forum_attachments = ctx.input.allowStudentForumAttachments;
    if (ctx.input.defaultView) courseData.default_view = ctx.input.defaultView;
    if (ctx.input.syllabusBody) courseData.syllabus_body = ctx.input.syllabusBody;
    if (ctx.input.termId) courseData.term_id = ctx.input.termId;
    if (ctx.input.restrictEnrollmentsToCourseDates !== undefined)
      courseData.restrict_enrollments_to_course_dates =
        ctx.input.restrictEnrollmentsToCourseDates;

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      if (!ctx.input.accountId)
        throw new Error('accountId is required when creating a course');
      result = await client.createCourse(ctx.input.accountId, courseData);
      actionDesc = 'Created';
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.courseId) throw new Error('courseId is required when updating a course');
      result = await client.updateCourse(ctx.input.courseId, courseData);
      actionDesc = 'Updated';
    } else if (ctx.input.action === 'delete' || ctx.input.action === 'conclude') {
      if (!ctx.input.courseId)
        throw new Error('courseId is required when deleting/concluding a course');
      result = await client.deleteCourse(ctx.input.courseId, ctx.input.action);
      actionDesc = ctx.input.action === 'delete' ? 'Deleted' : 'Concluded';
    } else {
      throw new Error(`Unknown action: ${ctx.input.action}`);
    }

    return {
      output: {
        courseId: String(result.id),
        name: result.name,
        courseCode: result.course_code,
        workflowState: result.workflow_state
      },
      message: `${actionDesc} course **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
