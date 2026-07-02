import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  clientId: z.string().optional(),
  billable: z.boolean(),
  isPublic: z.boolean(),
  archived: z.boolean(),
  color: z.string().optional(),
  note: z.string().optional()
});

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in the Clockify workspace. Set name, client, visibility, billing, color, and notes.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      clientId: z.string().optional().describe('Client ID to associate with the project'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the project is visible to all workspace members'),
      color: z.string().optional().describe('Project color hex code (e.g., "#FF5722")'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      note: z.string().optional().describe('Project notes')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let project = await client.createProject({
      name: ctx.input.name,
      clientId: ctx.input.clientId,
      isPublic: ctx.input.isPublic,
      color: ctx.input.color,
      billable: ctx.input.billable,
      note: ctx.input.note
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        clientId: project.clientId || undefined,
        billable: project.billable ?? false,
        isPublic: project.public ?? true,
        archived: project.archived ?? false,
        color: project.color || undefined,
        note: project.note || undefined
      },
      message: `Created project **${project.name}**.`
    };
  })
  .build();

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Clockify. Modify its name, client, visibility, billing, color, notes, or archive status. Active projects must be archived before deletion.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('Updated project name'),
      clientId: z.string().optional().describe('Updated client ID'),
      isPublic: z.boolean().optional().describe('Updated visibility'),
      color: z.string().optional().describe('Updated color hex code'),
      billable: z.boolean().optional().describe('Updated billable status'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      note: z.string().optional().describe('Updated notes')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let project = await client.updateProject(ctx.input.projectId, {
      name: ctx.input.name,
      clientId: ctx.input.clientId,
      isPublic: ctx.input.isPublic,
      color: ctx.input.color,
      billable: ctx.input.billable,
      archived: ctx.input.archived,
      note: ctx.input.note
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        clientId: project.clientId || undefined,
        billable: project.billable ?? false,
        isPublic: project.public ?? true,
        archived: project.archived ?? false,
        color: project.color || undefined,
        note: project.note || undefined
      },
      message: `Updated project **${project.name}**.`
    };
  })
  .build();

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Delete a project from Clockify. The project must be archived before it can be deleted.`,
  constraints: ['Project must be archived before deletion'],
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteProject(ctx.input.projectId);

    return {
      output: { deleted: true },
      message: `Deleted project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getProjects = SlateTool.create(spec, {
  name: 'Get Projects',
  key: 'get_projects',
  description: `List projects in the Clockify workspace. Filter by name, archived status, client, or billable status. Supports pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by project name (partial match)'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      clientId: z.string().optional().describe('Filter by client ID'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      projects: z.array(projectOutputSchema),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let projects = await client.getProjects({
      name: ctx.input.name,
      archived: ctx.input.archived,
      clients: ctx.input.clientId,
      billable: ctx.input.billable,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (projects as any[]).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      clientId: p.clientId || undefined,
      billable: p.billable ?? false,
      isPublic: p.public ?? true,
      archived: p.archived ?? false,
      color: p.color || undefined,
      note: p.note || undefined
    }));

    return {
      output: { projects: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** projects.`
    };
  })
  .build();
