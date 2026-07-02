import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z
  .object({
    projectId: z.string().optional().describe('Project identifier'),
    name: z.string().optional().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    apis: z.array(z.string()).optional().describe('API names in the project'),
    domains: z.array(z.string()).optional().describe('Domain names in the project')
  })
  .passthrough();

export let manageProjects = SlateTool.create(spec, {
  name: 'Manage Projects',
  key: 'manage_projects',
  description: `List, create, update, or delete projects in SwaggerHub. Projects organize APIs and domains into logical groups for better team-level access control. You can also add APIs or domains to existing projects.`,
  instructions: [
    'To list all projects for an owner, set action to "list".',
    'To add an API or domain to a project, set action to "add_resource" and provide specType and resourceName.'
  ]
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Owner (username or organization). Falls back to config owner.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'add_resource'])
        .describe('Operation to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for get, update, delete, add_resource)'),
      name: z.string().optional().describe('Project name (required for create)'),
      description: z.string().optional().describe('Project description'),
      specType: z
        .enum(['apis', 'domains'])
        .optional()
        .describe('Type of resource to add (for add_resource action)'),
      resourceName: z
        .string()
        .optional()
        .describe('Name of the API or domain to add (for add_resource action)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(projectSchema)
        .optional()
        .describe('List of projects (for list action)'),
      project: projectSchema.optional().describe('Project details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let { action, projectId, name, description, specType, resourceName } = ctx.input;

    switch (action) {
      case 'list': {
        let result = await client.getProjects(owner);
        let projects = Array.isArray(result) ? result : [];
        return {
          output: { projects, success: true },
          message: `Found **${projects.length}** project(s) for **${owner}**.`
        };
      }
      case 'get': {
        if (!projectId) throw new Error('projectId is required for get.');
        let project = await client.getProject(owner, projectId);
        return {
          output: { project, success: true },
          message: `Retrieved project **${projectId}** for **${owner}**.`
        };
      }
      case 'create': {
        if (!name) throw new Error('name is required to create a project.');
        let project = await client.createProject(owner, { name, description });
        return {
          output: { project, success: true },
          message: `Created project **${name}** for **${owner}**.`
        };
      }
      case 'update': {
        if (!projectId) throw new Error('projectId is required for update.');
        let project = await client.updateProject(owner, projectId, { name, description });
        return {
          output: { project, success: true },
          message: `Updated project **${projectId}** for **${owner}**.`
        };
      }
      case 'delete': {
        if (!projectId) throw new Error('projectId is required for delete.');
        await client.deleteProject(owner, projectId);
        return {
          output: { success: true },
          message: `Deleted project **${projectId}** from **${owner}**.`
        };
      }
      case 'add_resource': {
        if (!projectId) throw new Error('projectId is required for add_resource.');
        if (!specType) throw new Error('specType is required for add_resource.');
        if (!resourceName) throw new Error('resourceName is required for add_resource.');
        await client.addToProject(owner, projectId, specType, resourceName);
        return {
          output: { success: true },
          message: `Added ${specType === 'apis' ? 'API' : 'domain'} **${resourceName}** to project **${projectId}**.`
        };
      }
    }
  })
  .build();
