import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let getApplication = SlateTool.create(spec, {
  name: 'Get Application',
  key: 'get_application',
  description: `Retrieve detailed information about a specific Codemagic application including branches, workflows, and repository details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('The application ID to retrieve')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Unique application identifier'),
      appName: z.string().describe('Name of the application'),
      workflowIds: z
        .array(z.string())
        .optional()
        .describe('Available workflow IDs (Workflow Editor apps only)'),
      workflows: z
        .record(z.string(), z.object({ name: z.string() }))
        .optional()
        .describe('Workflow details keyed by workflow ID'),
      branches: z.array(z.string()).optional().describe('Available Git branches'),
      teamId: z.string().optional().describe('Team the application belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let app = await client.getApplication(ctx.input.appId);

    let output = {
      appId: app._id,
      appName: app.appName,
      workflowIds: app.workflowIds,
      workflows: app.workflows,
      branches: app.branches,
      teamId: app.teamId
    };

    return {
      output,
      message: `Retrieved application **${app.appName}** (${app._id}).`
    };
  })
  .build();
