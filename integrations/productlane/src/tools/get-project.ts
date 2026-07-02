import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Portal Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific portal project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique ID of the project'),
      name: z.string().describe('Project name'),
      description: z.string().nullable().describe('Project description'),
      color: z.string().nullable().describe('Project color'),
      icon: z.string().nullable().describe('Project icon'),
      state: z.string().nullable().describe('Project state'),
      progress: z.number().nullable().describe('Progress percentage (0-100)'),
      upvotes: z.number().describe('Number of upvotes'),
      importanceScore: z.number().describe('Importance score'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId || ctx.config.workspaceId;
    if (!workspaceId) {
      throw new Error(
        'workspaceId is required. Provide it in the input or set it in the config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let p = await client.getProject(workspaceId, ctx.input.projectId);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        description: p.description ?? null,
        color: p.color ?? null,
        icon: p.icon ?? null,
        state: p.state ?? null,
        progress: p.progress ?? null,
        upvotes: p.upvotes ?? 0,
        importanceScore: p.importanceScore ?? 0,
        createdAt: p.createdAt
      },
      message: `Retrieved project **${p.name}** (${p.id}).`
    };
  })
  .build();
