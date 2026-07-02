import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let listGeofenceProjects = SlateTool.create(spec, {
  name: 'List Geofence Projects',
  key: 'list_geofence_projects',
  description: `List all geofencing projects. Projects are used to organize geofences into logical groups for easier administration.`,
  instructions: ['Requires an Admin Key in authentication for geofencing operations'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Project unique identifier'),
            projectName: z.string().optional().describe('Project name')
          })
        )
        .describe('List of geofencing projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.listProjects();
    let projects = (data.projects || data || []).map((p: any) => ({
      projectId: p.id || p.projectId,
      projectName: p.name
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** geofencing project(s).`
    };
  })
  .build();

export let createGeofenceProject = SlateTool.create(spec, {
  name: 'Create Geofence Project',
  key: 'create_geofence_project',
  description: `Create a new geofencing project. Projects are containers for organizing geofences.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name for the new project')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the created project'),
      projectName: z.string().optional().describe('Name of the created project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.createProject({ name: ctx.input.projectName });

    return {
      output: {
        projectId: data.id || data.projectId,
        projectName: data.name || ctx.input.projectName
      },
      message: `Created geofencing project **${ctx.input.projectName}**.`
    };
  })
  .build();

export let deleteGeofenceProject = SlateTool.create(spec, {
  name: 'Delete Geofence Project',
  key: 'delete_geofence_project',
  description: `Delete a geofencing project and all its associated fences.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted geofencing project \`${ctx.input.projectId}\`.`
    };
  })
  .build();
