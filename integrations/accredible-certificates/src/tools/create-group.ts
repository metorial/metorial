import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new credential group. Groups represent achievements such as courses or qualifications. Credentials are always issued within a group. Configure the group name, course details, design template, and language.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Internal group name (used for identification)'),
      courseName: z
        .string()
        .describe('Public-facing course/achievement name displayed on credentials'),
      courseDescription: z
        .string()
        .optional()
        .describe('Description of the course or achievement'),
      courseLink: z.string().optional().describe('URL linking to the course or program page'),
      designId: z
        .number()
        .optional()
        .describe('ID of the certificate/badge design template to use'),
      language: z
        .string()
        .optional()
        .describe('Language for the credential (e.g., "en", "es", "fr")'),
      attachPdf: z
        .boolean()
        .optional()
        .describe('Whether to attach a PDF to issued credentials')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('ID of the created group'),
      name: z.string().optional().describe('Group name'),
      courseName: z.string().optional().describe('Course name'),
      courseDescription: z.string().optional().describe('Course description'),
      courseLink: z.string().optional().describe('Course link')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let group = await client.createGroup({
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
      message: `Group **${group.name}** (ID: ${group.id}) created with course name **${group.course_name}**.`
    };
  })
  .build();
