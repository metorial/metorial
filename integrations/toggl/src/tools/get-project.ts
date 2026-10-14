import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve a Toggl Track project by ID, including its client, privacy, billing and estimate settings. Call get_workspace to discover workspaces and list_projects to discover project IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
      projectId: z.string().describe('Project ID. Call list_projects to discover project IDs.')
    })
  )
  .output(
    z.object({
      projectId: z.number(),
      workspaceId: z.number(),
      name: z.string(),
      clientId: z.number().nullable(),
      active: z.boolean(),
      isPrivate: z.boolean(),
      billable: z.boolean().nullable(),
      color: z.string().nullable(),
      estimatedHours: z.number().nullable(),
      rate: z.number().nullable(),
      currency: z.string().nullable(),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let workspaceId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);
    let project = await client.getProject(workspaceId, ctx.input.projectId);
    return {
      output: {
        projectId: project.id,
        workspaceId: project.workspace_id ?? project.wid ?? Number(workspaceId),
        name: project.name,
        clientId: project.client_id ?? project.cid ?? null,
        active: project.active ?? true,
        isPrivate: project.is_private ?? false,
        billable: project.billable ?? null,
        color: project.color ?? null,
        estimatedHours: project.estimated_hours ?? null,
        rate: project.rate ?? null,
        currency: project.currency ?? null,
        createdAt: project.created_at ?? null,
        updatedAt: project.at ?? null
      },
      message: `Retrieved project **${project.name}**`
    };
  })
  .build();
