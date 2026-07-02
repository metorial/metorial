import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve details of a single credential group by its ID. Returns group configuration including course name, description, link, and design settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the credential group to retrieve')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Group ID'),
      name: z.string().optional().describe('Internal group name'),
      courseName: z.string().optional().describe('Public course name'),
      courseDescription: z.string().optional().describe('Course description'),
      courseLink: z.string().optional().describe('Course URL'),
      designId: z.number().optional().describe('Design template ID'),
      language: z.string().optional().describe('Group language'),
      credentialCount: z.number().optional().describe('Number of credentials in the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let group = await client.getGroup(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        name: group.name,
        courseName: group.course_name,
        courseDescription: group.course_description,
        courseLink: group.course_link,
        designId: group.design_id,
        language: group.language,
        credentialCount: group.credential_count
      },
      message: `Group **${group.name}** (ID: ${group.id}) - course: **${group.course_name}**.`
    };
  })
  .build();
