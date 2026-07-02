import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

export let createCourse = SlateTool.create(spec, {
  name: 'Create Course',
  key: 'create_course',
  description: `Create a new course in Google Classroom. The authenticated user becomes the course owner. Specify a name and optionally a section, description, room, and initial state.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.createCourse)
  .input(
    z.object({
      name: z.string().describe('Name of the course (required)'),
      section: z.string().optional().describe('Section of the course (e.g., "Period 1")'),
      descriptionHeading: z.string().optional().describe('Heading for the description'),
      description: z.string().optional().describe('Description of the course'),
      room: z.string().optional().describe('Room location for the course'),
      ownerId: z
        .string()
        .optional()
        .describe('User ID or email of the course owner. Defaults to the authenticated user.'),
      courseState: z
        .enum(['ACTIVE', 'PROVISIONED'])
        .optional()
        .describe('Initial state of the course. Defaults to PROVISIONED.')
    })
  )
  .output(
    z.object({
      courseId: z.string().optional().describe('Unique identifier for the created course'),
      name: z.string().optional().describe('Name of the created course'),
      section: z.string().optional().describe('Section of the course'),
      courseState: z.string().optional().describe('State of the course'),
      alternateLink: z.string().optional().describe('URL to the course in Classroom'),
      enrollmentCode: z.string().optional().describe('Enrollment code for the course'),
      creationTime: z.string().optional().describe('When the course was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });
    let ownerId = ctx.input.ownerId ?? 'me';
    let courseState = ctx.input.courseState ?? 'PROVISIONED';

    let course = await client.createCourse({
      name: ctx.input.name,
      section: ctx.input.section,
      descriptionHeading: ctx.input.descriptionHeading,
      description: ctx.input.description,
      room: ctx.input.room,
      ownerId,
      courseState
    });

    return {
      output: {
        courseId: course.id,
        name: course.name,
        section: course.section,
        courseState: course.courseState,
        alternateLink: course.alternateLink,
        enrollmentCode: course.enrollmentCode,
        creationTime: course.creationTime
      },
      message: `Created course **${course.name}** with ID \`${course.id}\`.`
    };
  })
  .build();
