import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique project identifier'),
  name: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  platform: z.string().optional().describe('Target platform (web, ios, android, macos)'),
  thumbnail: z.string().optional().describe('Project thumbnail URL'),
  status: z.string().optional().describe('Project status (active, archived)'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp'),
  numberOfMembers: z.number().optional().describe('Number of project members'),
  numberOfScreens: z.number().optional().describe('Number of screens'),
  numberOfComponents: z.number().optional().describe('Number of components'),
  organizationId: z.string().optional().describe('Parent organization ID'),
  organizationName: z.string().optional().describe('Parent organization name')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Zeplin projects the authenticated user is a member of. Returns project metadata including name, platform, status, and resource counts. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default: 30)'),
      offset: z.number().min(0).optional().describe('Pagination offset (default: 0)'),
      status: z
        .string()
        .optional()
        .describe('Filter by project status (e.g. "active", "archived")'),
      workspace: z.string().optional().describe('Filter by workspace ID')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let projects = (await client.listProjects({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      status: ctx.input.status,
      workspace: ctx.input.workspace
    })) as any[];

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description,
      platform: p.platform,
      thumbnail: p.thumbnail,
      status: p.status,
      created: p.created,
      updated: p.updated,
      numberOfMembers: p.number_of_members,
      numberOfScreens: p.number_of_screens,
      numberOfComponents: p.number_of_components,
      organizationId: p.organization?.id,
      organizationName: p.organization?.name
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
