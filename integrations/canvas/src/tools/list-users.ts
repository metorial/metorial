import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Course Users',
  key: 'list_course_users',
  description: `List users enrolled in a course. Filter by enrollment type and search by name or ID. Returns user details including name, email, and enrollment information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      searchTerm: z
        .string()
        .optional()
        .describe('Partial user name or full ID to search for (min 3 chars)'),
      enrollmentType: z
        .array(z.enum(['student', 'teacher', 'ta', 'observer', 'designer']))
        .optional()
        .describe('Filter by enrollment role'),
      includeEmail: z.boolean().optional().describe('Include email addresses'),
      includeEnrollments: z.boolean().optional().describe('Include enrollment details'),
      includeAvatar: z.boolean().optional().describe('Include avatar URLs')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('Canvas user ID'),
          name: z.string().describe('User full name'),
          sortableName: z.string().optional().describe('Name in last, first format'),
          shortName: z.string().optional().describe('User short/display name'),
          email: z.string().optional().nullable().describe('User email address'),
          loginId: z.string().optional().describe('User login ID'),
          avatarUrl: z.string().optional().describe('User avatar URL')
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
    if (ctx.input.includeEmail) include.push('email');
    if (ctx.input.includeEnrollments) include.push('enrollments');
    if (ctx.input.includeAvatar) include.push('avatar_url');

    let raw = await client.listCourseUsers(ctx.input.courseId, {
      searchTerm: ctx.input.searchTerm,
      enrollmentType: ctx.input.enrollmentType,
      include: include.length > 0 ? include : undefined
    });

    let users = raw.map((u: any) => ({
      userId: String(u.id),
      name: u.name,
      sortableName: u.sortable_name,
      shortName: u.short_name,
      email: u.email,
      loginId: u.login_id,
      avatarUrl: u.avatar_url
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s) in course ${ctx.input.courseId}.`
    };
  })
  .build();
