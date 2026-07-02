import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateCourse = SlateTool.create(spec, {
  name: 'Update Course',
  key: 'update_course',
  description: `Update an existing Google Classroom course. Modify the name, section, description, room, or state. Only the specified fields are updated; other fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .scopes(googleClassroomActionScopes.updateCourse)
  .input(
    z.object({
      courseId: z.string().describe('ID of the course to update'),
      name: z.string().optional().describe('New name for the course'),
      section: z.string().optional().describe('New section for the course'),
      descriptionHeading: z.string().optional().describe('New heading for the description'),
      description: z.string().optional().describe('New description for the course'),
      room: z.string().optional().describe('New room location'),
      courseState: z
        .enum(['ACTIVE', 'ARCHIVED', 'PROVISIONED', 'DECLINED', 'SUSPENDED'])
        .optional()
        .describe('New state for the course')
    })
  )
  .output(
    z
      .object({
        courseId: z.string().optional().describe('ID of the updated course'),
        name: z.string().optional().describe('Name of the updated course'),
        section: z.string().optional().describe('Section of the course'),
        courseState: z.string().optional().describe('State of the course'),
        alternateLink: z.string().optional().describe('URL to the course in Classroom'),
        updateTime: z.string().optional().describe('When the course was last updated')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new ClassroomClient({ token: ctx.auth.token });

    let updateFields: Record<string, any> = {};
    let maskParts: string[] = [];

    if (ctx.input.name !== undefined) {
      updateFields.name = ctx.input.name;
      maskParts.push('name');
    }
    if (ctx.input.section !== undefined) {
      updateFields.section = ctx.input.section;
      maskParts.push('section');
    }
    if (ctx.input.descriptionHeading !== undefined) {
      updateFields.descriptionHeading = ctx.input.descriptionHeading;
      maskParts.push('descriptionHeading');
    }
    if (ctx.input.description !== undefined) {
      updateFields.description = ctx.input.description;
      maskParts.push('description');
    }
    if (ctx.input.room !== undefined) {
      updateFields.room = ctx.input.room;
      maskParts.push('room');
    }
    if (ctx.input.courseState !== undefined) {
      updateFields.courseState = ctx.input.courseState;
      maskParts.push('courseState');
    }

    let course = await client.updateCourse(
      ctx.input.courseId,
      updateFields,
      maskParts.join(',')
    );

    return {
      output: {
        ...course,
        courseId: course.id
      },
      message: `Updated course **${course.name}**. Fields changed: ${maskParts.join(', ')}.`
    };
  })
  .build();
