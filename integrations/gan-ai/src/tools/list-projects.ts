import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all video projects within a workspace (Studio API). Returns project details including project type, status, available credits, tags, and video URLs. The project ID is required for creating personalized videos and managing webhooks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID to list projects from')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          title: z.string().describe('Project title'),
          projectType: z
            .string()
            .describe('Project type (PERSONALIZED, PERSONALIZED_INSTANT, NON_PERSONALIZED)'),
          status: z.string().describe('Project status'),
          thumbnail: z.string().nullable().describe('Thumbnail URL'),
          language: z.string().nullable().describe('Project language'),
          tags: z
            .object({
              colors: z.array(z.string()),
              names: z.array(z.string())
            })
            .nullable()
            .describe('Project tags with variable names and color codes'),
          availableCredits: z.number().describe('Remaining video generation credits'),
          utilisedCredits: z.number().describe('Credits already used'),
          videoUrl: z.string().nullable().describe('Base video URL'),
          smartUrl: z.string().nullable().describe('Smart landing page URL'),
          recordingScript: z.string().nullable().describe('Recording script text'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          updatedAt: z.string().describe('ISO 8601 last update timestamp')
        })
      ),
      totalProjects: z.number().describe('Total number of projects'),
      unpublishedProjects: z.number().describe('Count of unpublished projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StudioClient(ctx.auth.token);
    let result = await client.listProjects(ctx.input.workspaceId);

    return {
      output: {
        projects: result.data.map(p => ({
          projectId: p.project_id,
          title: p.title,
          projectType: p.project_type,
          status: p.status,
          thumbnail: p.thumbnail,
          language: p.language,
          tags: p.tags,
          availableCredits: p.available_credits,
          utilisedCredits: p.utilised_credits,
          videoUrl: p.video,
          smartUrl: p.smart_url,
          recordingScript: p.recording_script,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        totalProjects: result.size,
        unpublishedProjects: result.unpublished_projects
      },
      message: `Found **${result.size}** projects (**${result.unpublished_projects}** unpublished).`
    };
  })
  .build();
