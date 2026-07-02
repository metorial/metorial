import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Lists all MongoDB Atlas projects (groups) accessible to the authenticated user. Can also retrieve details of a specific organization. Use this to discover available projects and their IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Filter projects by organization ID, or retrieve organization details'),
      itemsPerPage: z.number().optional().describe('Number of results per page (max 500)'),
      pageNum: z.number().optional().describe('Page number (1-indexed)')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          name: z.string(),
          organizationId: z.string(),
          clusterCount: z.number(),
          created: z.string()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    let result = await client.listProjects({
      itemsPerPage: ctx.input.itemsPerPage,
      pageNum: ctx.input.pageNum
    });

    let projects = (result.results || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      organizationId: p.orgId,
      clusterCount: p.clusterCount || 0,
      created: p.created
    }));

    if (ctx.input.organizationId) {
      projects = projects.filter((p: any) => p.organizationId === ctx.input.organizationId);
    }

    return {
      output: {
        projects,
        totalCount: projects.length
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
