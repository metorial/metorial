import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new BugHerd project linked to a website URL. Configure settings like public feedback visibility and guest permissions.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      devurl: z.string().describe('Website URL to associate with the project'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the project is active (defaults to true)'),
      isPublic: z.boolean().optional().describe('Whether public feedback is enabled'),
      guestsSeeGuests: z
        .boolean()
        .optional()
        .describe('Whether guests can see other guests on the project')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created project'),
      name: z.string().describe('Project name'),
      devurl: z.string().describe('Website URL'),
      isActive: z.boolean().describe('Whether the project is active'),
      isPublic: z.boolean().describe('Whether public feedback is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);
    let p = await client.createProject({
      name: ctx.input.name,
      devurl: ctx.input.devurl,
      isActive: ctx.input.isActive,
      isPublic: ctx.input.isPublic,
      guestsSeeGuests: ctx.input.guestsSeeGuests
    });

    return {
      output: {
        projectId: p.id,
        name: p.name,
        devurl: p.devurl,
        isActive: p.is_active,
        isPublic: p.is_public
      },
      message: `Created project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();
