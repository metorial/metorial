import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `DEPRECATED — unavailable with project-scoped data-plane API keys. Manage projects in HoneyHive administration using separate control-plane credentials. This tool reports the limitation without making an API request.`,
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter projects by name')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project identifier'),
            name: z.string().describe('Project name'),
            description: z.string().optional().describe('Project description')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Project management requires separate HoneyHive control-plane credentials and is unavailable on this project-scoped connection.',
      { reason: 'honeyhive_control_plane_unavailable' }
    );
  })
  .build();

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `DEPRECATED — unavailable with project-scoped data-plane API keys. Manage projects in HoneyHive administration using separate control-plane credentials. This tool reports the limitation without making an API request.`,
  tags: {
    destructive: false,
    deprecated: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      name: z.string().describe('Name of the created project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Project management requires separate HoneyHive control-plane credentials and is unavailable on this project-scoped connection.',
      { reason: 'honeyhive_control_plane_unavailable' }
    );
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `DEPRECATED — unavailable with project-scoped data-plane API keys. Manage projects in HoneyHive administration using separate control-plane credentials. This tool reports the limitation without making an API request.`,
  tags: {
    destructive: false,
    deprecated: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      description: z.string().optional().describe('New description for the project')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Project management requires separate HoneyHive control-plane credentials and is unavailable on this project-scoped connection.',
      { reason: 'honeyhive_control_plane_unavailable' }
    );
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `DEPRECATED — unavailable with project-scoped data-plane API keys. Manage projects in HoneyHive administration using separate control-plane credentials. This tool reports the limitation without making an API request.`,
  tags: {
    destructive: true,
    deprecated: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Project management requires separate HoneyHive control-plane credentials and is unavailable on this project-scoped connection.',
      { reason: 'honeyhive_control_plane_unavailable' }
    );
  })
  .build();
