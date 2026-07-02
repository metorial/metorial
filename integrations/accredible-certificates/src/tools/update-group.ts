import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing credential group's settings. Modify the group name, course details, design template, language, and PDF attachment settings. Only the fields you provide will be updated.`,
  instructions: [
    'Provide only the fields you want to change; omitted fields remain unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the credential group to update'),
      name: z.string().optional().describe('New internal group name'),
      courseName: z.string().optional().describe('New public course name'),
      courseDescription: z.string().optional().describe('New course description'),
      courseLink: z.string().optional().describe('New course URL'),
      designId: z.number().optional().describe('New design template ID'),
      language: z.string().optional().describe('New language setting'),
      attachPdf: z.boolean().optional().describe('Whether to attach PDF to credentials')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('ID of the updated group'),
      name: z.string().optional().describe('Updated group name'),
      courseName: z.string().optional().describe('Updated course name'),
      courseDescription: z.string().optional().describe('Updated course description'),
      courseLink: z.string().optional().describe('Updated course link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let group = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      courseName: ctx.input.courseName,
      courseDescription: ctx.input.courseDescription,
      courseLink: ctx.input.courseLink,
      designId: ctx.input.designId,
      language: ctx.input.language,
      attachPdf: ctx.input.attachPdf
    });

    return {
      output: {
        groupId: group.id,
        name: group.name,
        courseName: group.course_name,
        courseDescription: group.course_description,
        courseLink: group.course_link
      },
      message: `Group **${group.id}** updated successfully.`
    };
  })
  .build();
