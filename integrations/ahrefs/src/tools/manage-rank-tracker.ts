import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRankTracker = SlateTool.create(spec, {
  name: 'Manage Rank Tracker',
  key: 'manage_rank_tracker',
  description: `Manage Rank Tracker projects and tracked keywords. Supports listing, creating, and deleting projects, as well as listing, adding, and removing keywords from projects.
Management endpoints are free (no API unit cost).`,
  instructions: [
    'Use "action" to specify the management operation: list-projects, create-project, delete-project, list-keywords, add-keywords, or remove-keywords.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list-projects',
          'create-project',
          'delete-project',
          'list-keywords',
          'add-keywords',
          'remove-keywords'
        ])
        .describe('Management action to perform'),
      projectId: z
        .string()
        .optional()
        .describe(
          'Project ID (required for delete-project, list-keywords, add-keywords, remove-keywords)'
        ),
      projectName: z
        .string()
        .optional()
        .describe('Name for the new project (required for create-project)'),
      target: z
        .string()
        .optional()
        .describe('Target domain for the new project (required for create-project)'),
      keywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to add/remove or initial keywords for new project')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the management operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    switch (ctx.input.action) {
      case 'list-projects':
        result = await client.listRankTrackerProjects();
        break;
      case 'create-project':
        if (!ctx.input.projectName)
          throw new Error('projectName is required for create-project');
        if (!ctx.input.target) throw new Error('target is required for create-project');
        result = await client.createRankTrackerProject({
          name: ctx.input.projectName,
          target: ctx.input.target,
          keywords: ctx.input.keywords
        });
        break;
      case 'delete-project':
        if (!ctx.input.projectId) throw new Error('projectId is required for delete-project');
        result = await client.deleteRankTrackerProject({ projectId: ctx.input.projectId });
        break;
      case 'list-keywords':
        if (!ctx.input.projectId) throw new Error('projectId is required for list-keywords');
        result = await client.listRankTrackerKeywords({ projectId: ctx.input.projectId });
        break;
      case 'add-keywords':
        if (!ctx.input.projectId) throw new Error('projectId is required for add-keywords');
        if (!ctx.input.keywords || ctx.input.keywords.length === 0)
          throw new Error('keywords are required for add-keywords');
        result = await client.addRankTrackerKeywords({
          projectId: ctx.input.projectId,
          keywords: ctx.input.keywords
        });
        break;
      case 'remove-keywords':
        if (!ctx.input.projectId) throw new Error('projectId is required for remove-keywords');
        if (!ctx.input.keywords || ctx.input.keywords.length === 0)
          throw new Error('keywords are required for remove-keywords');
        result = await client.removeRankTrackerKeywords({
          projectId: ctx.input.projectId,
          keywords: ctx.input.keywords
        });
        break;
    }

    return {
      output: {
        result
      },
      message: `Completed rank tracker action: **${ctx.input.action}**${ctx.input.projectId ? ` on project ${ctx.input.projectId}` : ''}.`
    };
  })
  .build();
