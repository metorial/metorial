import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List all applications connected to your Codemagic account. Returns application IDs, names, workflows, and repository information. Use this to discover available apps before triggering builds.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      applications: z.array(
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
          branches: z.array(z.string()).optional().describe('Available branches'),
          teamId: z.string().optional().describe('Team the application belongs to')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let apps = await client.listApplications();

    let applications = apps.map(app => ({
      appId: app._id,
      appName: app.appName,
      workflowIds: app.workflowIds,
      workflows: app.workflows,
      branches: app.branches,
      teamId: app.teamId
    }));

    return {
      output: { applications },
      message: `Found **${applications.length}** application(s).`
    };
  })
  .build();
