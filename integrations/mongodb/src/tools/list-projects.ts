import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique identifier of the project'),
  name: z.string().describe('Human-readable name of the project'),
  orgId: z.string().describe('Organization ID that the project belongs to'),
  clusterCount: z.number().describe('Number of clusters deployed in this project'),
  created: z.string().describe('ISO 8601 timestamp when the project was created')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all MongoDB Atlas projects accessible with the current credentials. Projects (also called "groups") are the primary containers for clusters, database users, and other resources. Use this to discover available projects before performing project-scoped operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Filter projects by organization ID. If omitted, lists all accessible projects.'
        ),
      itemsPerPage: z.number().optional().describe('Number of results per page (max 500)'),
      pageNum: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects'),
      totalCount: z.number().describe('Total number of projects matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AtlasClient(ctx.auth);

    let result: any;
    if (ctx.input.organizationId) {
      result = await client.listOrganizationProjects(ctx.input.organizationId, {
        itemsPerPage: ctx.input.itemsPerPage,
        pageNum: ctx.input.pageNum
      });
    } else {
      result = await client.listProjects({
        itemsPerPage: ctx.input.itemsPerPage,
        pageNum: ctx.input.pageNum
      });
    }

    let projects = (result.results || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      orgId: p.orgId,
      clusterCount: p.clusterCount ?? 0,
      created: p.created
    }));

    return {
      output: {
        projects,
        totalCount: result.totalCount ?? projects.length
      },
      message: `Found **${projects.length}** projects${ctx.input.organizationId ? ` in organization ${ctx.input.organizationId}` : ''}.`
    };
  })
  .build();
