import { createApiServiceError, SlateTool } from 'slates';
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
    'To add an API or domain to a project, set action to "add_resource" and provide specType and resourceName.',
    'Project IDs are project names. Use list to discover them. When updating, supplied apis or domains replace their entire lists; omitted fields are preserved.'
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
        .describe(
          'Project name returned by list (required for get, update, delete, add_resource)'
        ),
      name: z.string().optional().describe('Project name (required for create)'),
      description: z.string().optional().describe('Project description'),
      apis: z
        .array(z.string())
        .optional()
        .describe('API names for create/update. Replaces the existing API list on update.'),
      domains: z
        .array(z.string())
        .optional()
        .describe(
          'Domain names for create/update. Replaces the existing domain list on update.'
        ),
      page: z.number().optional().describe('Page number for list (0-based)'),
      limit: z.number().optional().describe('Results per page for list (1-100, default 10)'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order for list'),
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
      totalCount: z.number().optional().describe('Total project count for list'),
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
      throw createApiServiceError(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let {
      action,
      projectId,
      name,
      description,
      apis,
      domains,
      page,
      limit,
      order,
      specType,
      resourceName
    } = ctx.input;
    if (page !== undefined && (!Number.isInteger(page) || page < 0)) {
      throw createApiServiceError('page must be a non-negative integer.');
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
      throw createApiServiceError('limit must be an integer between 1 and 100.');
    }

    switch (action) {
      case 'list': {
        let result = await client.getProjects(owner, { page, limit, order });
        let parsed = projectSchema
          .array()
          .safeParse(Array.isArray(result) ? result : result?.projects);
        if (!parsed.success) {
          throw createApiServiceError('SwaggerHub returned an invalid project list.');
        }
        let projects = parsed.data.map(project => ({
          ...project,
          projectId: project.projectId ?? project.name
        }));
        return {
          output: {
            projects,
            totalCount: result?.totalCount ?? projects.length,
            success: true
          },
          message: `Found **${projects.length}** project(s) for **${owner}**.`
        };
      }
      case 'get': {
        if (!projectId) throw createApiServiceError('projectId is required for get.');
        let parsed = projectSchema.safeParse(await client.getProject(owner, projectId));
        if (!parsed.success)
          throw createApiServiceError('SwaggerHub returned invalid project details.');
        let project = { ...parsed.data, projectId: parsed.data.projectId ?? projectId };
        return {
          output: { project, success: true },
          message: `Retrieved project **${projectId}** for **${owner}**.`
        };
      }
      case 'create': {
        if (!name) throw createApiServiceError('name is required to create a project.');
        await client.createProject(owner, { name, description, apis, domains });
        let project = {
          projectId: name,
          name,
          description,
          apis: apis ?? [],
          domains: domains ?? []
        };
        return {
          output: { project, success: true },
          message: `Created project **${name}** for **${owner}**.`
        };
      }
      case 'update': {
        if (!projectId) throw createApiServiceError('projectId is required for update.');
        if (
          name === undefined &&
          description === undefined &&
          apis === undefined &&
          domains === undefined
        ) {
          throw createApiServiceError('Provide at least one project field to update.');
        }
        let existing = projectSchema.safeParse(await client.getProject(owner, projectId));
        if (!existing.success)
          throw createApiServiceError('SwaggerHub returned invalid project details.');
        let project = {
          projectId: name ?? existing.data.name ?? projectId,
          name: name ?? existing.data.name ?? projectId,
          description: description ?? existing.data.description ?? '',
          apis: apis ?? existing.data.apis ?? [],
          domains: domains ?? existing.data.domains ?? []
        };
        await client.updateProject(owner, projectId, {
          name: project.name,
          description: project.description,
          apis: project.apis,
          domains: project.domains
        });
        return {
          output: { project, success: true },
          message: `Updated project **${projectId}** for **${owner}**.`
        };
      }
      case 'delete': {
        if (!projectId) throw createApiServiceError('projectId is required for delete.');
        await client.deleteProject(owner, projectId);
        return {
          output: { success: true },
          message: `Deleted project **${projectId}** from **${owner}**.`
        };
      }
      case 'add_resource': {
        if (!projectId) throw createApiServiceError('projectId is required for add_resource.');
        if (!specType) throw createApiServiceError('specType is required for add_resource.');
        if (!resourceName)
          throw createApiServiceError('resourceName is required for add_resource.');
        await client.addToProject(owner, projectId, specType, resourceName);
        return {
          output: { success: true },
          message: `Added ${specType === 'apis' ? 'API' : 'domain'} **${resourceName}** to project **${projectId}**.`
        };
      }
    }
  })
  .build();
