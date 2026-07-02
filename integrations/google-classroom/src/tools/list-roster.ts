import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let userProfileSchema = z
  .object({
    userId: z.string().optional().describe('User ID'),
    name: z
      .object({
        givenName: z.string().optional(),
        familyName: z.string().optional(),
        fullName: z.string().optional()
      })
      .optional()
      .describe('User name'),
    emailAddress: z.string().optional().describe('User email address'),
    photoUrl: z.string().optional().describe('User profile photo URL')
  })
  .optional();

let rosterMemberSchema = z.object({
  courseId: z.string().optional().describe('Course ID'),
  userId: z.string().optional().describe('User ID'),
  profile: userProfileSchema.describe('User profile information')
});

export let listRoster = SlateTool.create(spec, {
  name: 'List Roster',
  key: 'list_roster',
  description: `List teachers and/or students enrolled in a Google Classroom course. Returns user profiles including names, emails, and photos.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleClassroomActionScopes.listRoster)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course'),
      role: z
        .enum(['teachers', 'students', 'both'])
        .default('both')
        .describe('Which roster members to list'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of members to return per role (max 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      teachers: z.array(rosterMemberSchema).optional().describe('List of teachers'),
      students: z.array(rosterMemberSchema).optional().describe('List of students'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page (applies to the last requested role)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let { courseId, role, pageSize, pageToken } = ctx.input;

    let teachers: any[] | undefined;
    let students: any[] | undefined;
    let nextPageToken: string | undefined;

    if (role === 'teachers' || role === 'both') {
      let result = await client.listTeachers(
        courseId,
        pageSize,
        role === 'teachers' ? pageToken : undefined
      );
      teachers = result.teachers || [];
      if (role === 'teachers') nextPageToken = result.nextPageToken;
    }

    if (role === 'students' || role === 'both') {
      let result = await client.listStudents(
        courseId,
        pageSize,
        role === 'students' ? pageToken : undefined
      );
      students = result.students || [];
      if (role === 'students' || role === 'both') nextPageToken = result.nextPageToken;
    }

    let teacherCount = teachers?.length ?? 0;
    let studentCount = students?.length ?? 0;

    return {
      output: {
        teachers,
        students,
        nextPageToken
      },
      message: `Found **${teacherCount}** teacher(s) and **${studentCount}** student(s) in course \`${courseId}\`.`
    };
  })
  .build();
