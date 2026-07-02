import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Project ID'),
  name: z.string().describe('Project name'),
  devurl: z.string().describe('Website URL associated with the project'),
  isActive: z.boolean().describe('Whether the project is active'),
  isPublic: z.boolean().describe('Whether public feedback is enabled'),
  hasCustomColumns: z.boolean().describe('Whether the project has custom Kanban columns'),
  guestsSeeGuests: z.boolean().describe('Whether guests can see other guests')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List BugHerd projects. Can show all projects or only active ones. Optionally scope to projects accessible by a specific user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z.boolean().default(false).describe('If true, only return active projects'),
      userId: z
        .number()
        .optional()
        .describe('If provided, list only projects accessible to this user')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugherdClient(ctx.auth.token);

    let rawProjects: any;
    if (ctx.input.userId) {
      rawProjects = await client.getUserProjects(ctx.input.userId, {
        isActive: ctx.input.activeOnly ? true : undefined
      });
    } else if (ctx.input.activeOnly) {
      rawProjects = await client.listActiveProjects();
    } else {
      rawProjects = await client.listProjects();
    }

    let projects = rawProjects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      devurl: p.devurl,
      isActive: p.is_active,
      isPublic: p.is_public,
      hasCustomColumns: p.has_custom_columns,
      guestsSeeGuests: p.guests_see_guests
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
