import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
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
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Portal Projects',
  key: 'list_projects',
  description: `List projects from the public portal/roadmap. Projects represent roadmap items that customers can view and upvote. Requires a workspace ID (uses config if not provided).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)'),
      language: z.string().optional().describe('Language code for localized content')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of portal projects')
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
    let result = await client.listProjects(workspaceId, { language: ctx.input.language });

    let projects = (Array.isArray(result) ? result : result.projects || []).map((p: any) => ({
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
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** portal projects.`
    };
  })
  .build();
