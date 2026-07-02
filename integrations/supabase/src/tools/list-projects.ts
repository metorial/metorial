import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Supabase projects accessible to the authenticated user. Returns project details including name, reference ID, region, status, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project reference ID'),
          name: z.string().describe('Project name'),
          organizationId: z.string().describe('Organization ID the project belongs to'),
          region: z.string().describe('Database region'),
          status: z.string().describe('Project status (e.g., ACTIVE_HEALTHY)'),
          createdAt: z.string().describe('Project creation timestamp')
        })
      ),
      totalCount: z.number().describe('Number of projects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient(ctx.auth.token);
    let data = await client.listProjects();

    let projects = (Array.isArray(data) ? data : []).map((p: any) => ({
      projectId: p.id ?? p.ref ?? '',
      name: p.name ?? '',
      organizationId: p.organization_id ?? '',
      region: p.region ?? '',
      status: p.status ?? '',
      createdAt: p.created_at ?? ''
    }));

    return {
      output: { projects, totalCount: projects.length },
      message: `Found **${projects.length}** Supabase projects.`
    };
  })
  .build();
