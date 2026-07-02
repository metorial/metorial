import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique ID of the project'),
  name: z.string().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  status: z.string().optional().describe('Project status'),
  companyName: z.string().optional().describe('Associated company name'),
  startDate: z.string().optional().describe('Project start date'),
  endDate: z.string().optional().describe('Project end date'),
  createdOn: z.string().optional().describe('Date the project was created'),
  lastChangedOn: z.string().optional().describe('Date the project was last changed')
});

let parseProject = (p: any) => ({
  projectId: String(p.id),
  name: p.name || '',
  description: p.description || undefined,
  status: p.status || undefined,
  companyName: p.company?.name || undefined,
  startDate: p['start-date'] || p.startDate || undefined,
  endDate: p['end-date'] || p.endDate || undefined,
  createdOn: p['created-on'] || p.createdOn || undefined,
  lastChangedOn: p['last-changed-on'] || p.lastChangedOn || undefined
});

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, or delete a Teamwork project. Use **create** to start a new project, **update** to modify an existing one, or **delete** to permanently remove it.`,
  instructions: [
    'For "create", at minimum provide a name.',
    'For "update" and "delete", provide the projectId of the target project.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The action to perform'),
      projectId: z.string().optional().describe('Project ID (required for update/delete)'),
      name: z.string().optional().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      companyId: z.string().optional().describe('Company ID to associate with the project'),
      categoryId: z.string().optional().describe('Category ID'),
      startDate: z.string().optional().describe('Start date (YYYYMMDD)'),
      endDate: z.string().optional().describe('End date (YYYYMMDD)'),
      status: z.string().optional().describe('Project status'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      project: projectSchema.optional().describe('The created or updated project'),
      deleted: z.boolean().optional().describe('Whether the project was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a project');
      let result = await client.createProject({
        name: ctx.input.name,
        description: ctx.input.description,
        companyId: ctx.input.companyId,
        categoryId: ctx.input.categoryId,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        status: ctx.input.status,
        tags: ctx.input.tags
      });
      let projectId = result.id || result.projectId;
      if (projectId) {
        let full = await client.getProject(String(projectId));
        let p = full.project || full;
        return {
          output: { project: parseProject(p) },
          message: `Created project **${ctx.input.name}**.`
        };
      }
      return {
        output: { project: undefined },
        message: `Created project **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.projectId) throw new Error('projectId is required to update a project');
      await client.updateProject(ctx.input.projectId, {
        name: ctx.input.name,
        description: ctx.input.description,
        companyId: ctx.input.companyId,
        categoryId: ctx.input.categoryId,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        status: ctx.input.status,
        tags: ctx.input.tags
      });
      let full = await client.getProject(ctx.input.projectId);
      let p = full.project || full;
      return {
        output: { project: parseProject(p) },
        message: `Updated project **${p.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.projectId) throw new Error('projectId is required to delete a project');
      await client.deleteProject(ctx.input.projectId);
      return {
        output: { deleted: true },
        message: `Deleted project **${ctx.input.projectId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
