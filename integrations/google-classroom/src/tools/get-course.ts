import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

export let getCourse = SlateTool.create(spec, {
  name: 'Get Course',
  key: 'get_course',
  description: `Retrieve detailed information about a specific Google Classroom course by its ID or alias. Returns full course metadata including name, section, description, enrollment code, and state.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleClassroomActionScopes.getCourse)
  .input(
    z.object({
      courseId: z.string().describe('ID or alias of the course to retrieve')
    })
  )
  .output(
    z.object({
      courseId: z.string().optional().describe('Unique identifier for the course'),
      name: z.string().optional().describe('Name of the course'),
      section: z.string().optional().describe('Section of the course'),
      descriptionHeading: z.string().optional().describe('Heading for the description'),
      description: z.string().optional().describe('Description of the course'),
      room: z.string().optional().describe('Room location'),
      ownerId: z.string().optional().describe('User ID of the course owner'),
      courseState: z.string().optional().describe('State of the course'),
      alternateLink: z.string().optional().describe('URL to the course in Classroom'),
      enrollmentCode: z.string().optional().describe('Enrollment code for the course'),
      creationTime: z.string().optional().describe('When the course was created'),
      updateTime: z.string().optional().describe('When the course was last updated'),
      guardiansEnabled: z.boolean().optional().describe('Whether guardians are enabled'),
      calendarId: z.string().optional().describe('Calendar ID for the course')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let course = await client.getCourse(ctx.input.courseId);

    return {
      output: {
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
        guardiansEnabled: course.guardiansEnabled,
        calendarId: course.calendarId
      },
      message: `Retrieved course **${course.name}** (${course.courseState}).`
    };
  })
  .build();
