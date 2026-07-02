import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  purpose: z.string().optional().describe('Project purpose'),
  environment: z
    .string()
    .optional()
    .describe('Environment (Development, Staging, Production)'),
  isDefault: z.boolean().describe('Whether this is the default project'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your DigitalOcean account. Projects help organize related resources (Droplets, Spaces, databases, etc.) together.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(projectSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let projects = await client.listProjects();

    return {
      output: {
        projects: projects.map((p: any) => ({
          projectId: p.id,
          name: p.name,
          description: p.description,
          purpose: p.purpose,
          environment: p.environment,
          isDefault: p.is_default,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }))
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a project. Projects organize related DigitalOcean resources together for better management.`
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectId: z.string().optional().describe('Project ID (required for update/delete)'),
      name: z.string().optional().describe('Project name (required for create)'),
      description: z.string().optional().describe('Project description'),
      purpose: z
        .string()
        .optional()
        .describe('Project purpose (e.g., "Web Application", "Service or API")'),
      environment: z
        .string()
        .optional()
        .describe('Environment: Development, Staging, or Production'),
      isDefault: z.boolean().optional().describe('Set as default project (for update)')
    })
  )
  .output(
    z.object({
      project: projectSchema.optional().describe('Created/updated project'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapProject = (p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description,
      purpose: p.purpose,
      environment: p.environment,
      isDefault: p.is_default,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw digitalOceanValidationError('name is required for create action');
      }
      let project = await client.createProject({
        name: ctx.input.name,
        description: ctx.input.description,
        purpose: ctx.input.purpose,
        environment: ctx.input.environment
      });
      return {
        output: { project: mapProject(project) },
        message: `Created project **${project.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.projectId) {
        throw digitalOceanValidationError('projectId is required for update action');
      }
      let project = await client.updateProject(ctx.input.projectId, {
        name: ctx.input.name,
        description: ctx.input.description,
        purpose: ctx.input.purpose,
        environment: ctx.input.environment,
        isDefault: ctx.input.isDefault
      });
      return {
        output: { project: mapProject(project) },
        message: `Updated project **${ctx.input.projectId}**.`
      };
    }

    // delete
    if (!ctx.input.projectId) {
      throw digitalOceanValidationError('projectId is required for delete action');
    }
    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let manageProjectResources = SlateTool.create(spec, {
  name: 'Manage Project Resources',
  key: 'manage_project_resources',
  description: `List resources in a project or assign resources to a project. Resources are identified by their URN (e.g., "do:droplet:123456", "do:space:my-bucket").`,
  instructions: [
    'Resource URN format: "do:<resource_type>:<resource_id>"',
    'Resource types: droplet, volume, space, database, domain, loadbalancer, kubernetes, app'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      action: z.enum(['list', 'assign']).describe('Action to perform'),
      resourceUrns: z
        .array(z.string())
        .optional()
        .describe('Resource URNs to assign (required for assign)')
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            urn: z.string().describe('Resource URN'),
            assignedAt: z.string().optional().describe('Assignment timestamp'),
            status: z.string().optional().describe('Resource status')
          })
        )
        .optional()
        .describe('Project resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let resources = await client.listProjectResources(ctx.input.projectId);
      return {
        output: {
          resources: resources.map((r: any) => ({
            urn: r.urn,
            assignedAt: r.assigned_at,
            status: r.status
          }))
        },
        message: `Found **${resources.length}** resource(s) in project **${ctx.input.projectId}**.`
      };
    }

    // assign
    if (!ctx.input.resourceUrns || ctx.input.resourceUrns.length === 0) {
      throw digitalOceanValidationError('resourceUrns are required for assign action');
    }
    let resources = await client.assignResourcesToProject(
      ctx.input.projectId,
      ctx.input.resourceUrns
    );

    return {
      output: {
        resources: resources.map((r: any) => ({
          urn: r.urn,
          assignedAt: r.assigned_at,
          status: r.status
        }))
      },
      message: `Assigned **${ctx.input.resourceUrns.length}** resource(s) to project **${ctx.input.projectId}**.`
    };
  })
  .build();
