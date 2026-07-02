import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let courseSchema = z.object({
  courseId: z.string().optional().describe('Unique identifier for the course'),
  name: z.string().optional().describe('Name of the course'),
  section: z.string().optional().describe('Section of the course'),
  descriptionHeading: z.string().optional().describe('Heading for the description'),
  description: z.string().optional().describe('Description of the course'),
  room: z.string().optional().describe('Room location'),
  ownerId: z.string().optional().describe('User ID of the course owner'),
  courseState: z
    .string()
    .optional()
    .describe('State of the course (ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED)'),
  alternateLink: z.string().optional().describe('URL to the course in Classroom'),
  enrollmentCode: z.string().optional().describe('Enrollment code for the course'),
  creationTime: z.string().optional().describe('When the course was created'),
  updateTime: z.string().optional().describe('When the course was last updated'),
  guardiansEnabled: z
    .boolean()
    .optional()
    .describe('Whether guardians are enabled for this course')
});

export let listCourses = SlateTool.create(spec, {
  name: 'List Courses',
  key: 'list_courses',
  description: `List courses in Google Classroom. Can filter by student, teacher, or course state. Returns course metadata including name, section, description, and enrollment information.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleClassroomActionScopes.listCourses)
  .input(
    z.object({
      studentId: z
        .string()
        .optional()
        .describe('Filter by student ID or email. Use "me" for the current user.'),
      teacherId: z
        .string()
        .optional()
        .describe('Filter by teacher ID or email. Use "me" for the current user.'),
      courseStates: z
        .array(z.enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED']))
        .optional()
        .describe('Filter by course states'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of courses to return (max 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      courses: z.array(courseSchema).describe('List of courses'),
      nextPageToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let result = await client.listCourses({
      studentId: ctx.input.studentId,
      teacherId: ctx.input.teacherId,
      courseStates: ctx.input.courseStates,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let courses = (result.courses || []).map((course: Record<string, any>) => ({
      courseId: course.id,
      name: course.name,
      section: course.section,
      descriptionHeading: course.descriptionHeading,
      description: course.description,
      room: course.room,
      ownerId: course.ownerId,
      courseState: course.courseState,
      alternateLink: course.alternateLink,
      enrollmentCode: course.enrollmentCode,
      creationTime: course.creationTime,
      updateTime: course.updateTime,
      guardiansEnabled: course.guardiansEnabled
    }));

    return {
      output: {
        courses,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${courses.length}** course(s).${result.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
