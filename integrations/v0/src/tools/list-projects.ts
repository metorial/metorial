import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique project identifier'),
  name: z.string().describe('Project name'),
  privacy: z.string().describe('Privacy setting (private or team)'),
  description: z.string().optional().describe('Project description'),
  instructions: z.string().optional().describe('Project instructions for the AI model'),
  vercelProjectId: z.string().optional().describe('Linked Vercel project ID'),
  createdAt: z.string().describe('ISO timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last update'),
  apiUrl: z.string().describe('API endpoint URL'),
  webUrl: z.string().describe('Web URL for the project')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all V0 projects in your workspace. Returns project names, IDs, privacy settings, and URLs for each project.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.listProjects();

    let projects = (result.data || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      privacy: p.privacy,
      description: p.description,
      instructions: p.instructions,
      vercelProjectId: p.vercelProjectId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      apiUrl: p.apiUrl,
      webUrl: p.webUrl
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
