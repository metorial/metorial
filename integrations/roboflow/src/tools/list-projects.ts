import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in a Roboflow workspace. Returns project metadata including name, type, image counts, annotation classes, and version counts. Useful for discovering available projects and their current state.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceName: z.string().describe('Name of the workspace'),
      workspaceUrl: z.string().describe('URL slug of the workspace'),
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project identifier'),
            name: z.string().describe('Display name of the project'),
            type: z.string().describe('Project type (e.g., object-detection, classification)'),
            imageCount: z.number().describe('Total number of images in the project'),
            unannotatedCount: z.number().describe('Number of unannotated images'),
            versionCount: z.number().describe('Number of dataset versions'),
            isPublic: z.boolean().describe('Whether the project is publicly accessible'),
            classes: z
              .record(z.string(), z.any())
              .optional()
              .describe('Map of class names to their counts'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the project was created'),
            updatedAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the project was last updated')
          })
        )
        .describe('List of projects in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let data = await client.getWorkspace(workspaceId);

    let workspace = data.workspace || data;
    let projects = (workspace.projects || []).map((p: any) => ({
      projectId: p.id || p.url,
      name: p.name,
      type: p.type,
      imageCount: p.images || 0,
      unannotatedCount: p.unannotated || 0,
      versionCount: p.versions || 0,
      isPublic: p.public || false,
      classes: p.classes,
      createdAt: p.created,
      updatedAt: p.updated
    }));

    return {
      output: {
        workspaceName: workspace.name || workspaceId,
        workspaceUrl: workspace.url || workspaceId,
        projects
      },
      message: `Found **${projects.length}** project(s) in workspace **${workspace.name || workspaceId}**.`
    };
  })
  .build();
