import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

export let manageProjectTool = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Get details about a specific project, create a new project, or delete an existing project. Projects are the primary containers for clusters, database users, and network configurations in MongoDB Atlas.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'delete']).describe('Action to perform'),
      projectId: z.string().optional().describe('Project ID (required for get and delete)'),
      name: z.string().optional().describe('Project name (required for create)'),
      organizationId: z.string().optional().describe('Organization ID (required for create)')
    })
  )
  .output(
    z.object({
      projectId: z.string().optional().describe('Project ID'),
      name: z.string().optional().describe('Project name'),
      orgId: z.string().optional().describe('Organization ID'),
      clusterCount: z.number().optional().describe('Number of clusters in the project'),
      created: z.string().optional().describe('ISO 8601 creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'get') {
      let pid = ctx.input.projectId || ctx.config.projectId;
      if (!pid) throw new Error('projectId is required for get action');
      let project = await client.getProject(pid);
      return {
        output: {
          projectId: project.id,
          name: project.name,
          orgId: project.orgId,
          clusterCount: project.clusterCount ?? 0,
          created: project.created
        },
        message: `Retrieved project **${project.name}** (${project.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let orgId = ctx.input.organizationId || ctx.config.organizationId;
      if (!orgId) throw new Error('organizationId is required for create action');
      let project = await client.createProject({
        name: ctx.input.name,
        orgId
      });
      return {
        output: {
          projectId: project.id,
          name: project.name,
          orgId: project.orgId,
          clusterCount: 0,
          created: project.created
        },
        message: `Created project **${project.name}** (${project.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      let pid = ctx.input.projectId || ctx.config.projectId;
      if (!pid) throw new Error('projectId is required for delete action');
      await client.deleteProject(pid);
      return {
        output: {
          projectId: pid,
          deleted: true
        },
        message: `Deleted project ${pid}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
