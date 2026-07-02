import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let listBuilds = SlateTool.create(spec, {
  name: 'List Builds',
  key: 'list_builds',
  description: `List builds across all applications or filtered to a specific application. Returns build IDs, statuses, branches, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().optional().describe('Filter builds by application ID')
    })
  )
  .output(
    z.object({
      builds: z.array(
        z.object({
          buildId: z.string().describe('Unique build identifier'),
          appId: z.string().describe('Application ID'),
          status: z.string().describe('Build status'),
          branch: z.string().optional().describe('Git branch'),
          tag: z.string().optional().describe('Git tag'),
          workflowId: z.string().optional().nullable().describe('Workflow ID'),
          fileWorkflowId: z
            .string()
            .optional()
            .nullable()
            .describe('Workflow ID from codemagic.yaml'),
          instanceType: z.string().optional().describe('Machine type'),
          startedAt: z.string().optional().nullable().describe('Build start time'),
          finishedAt: z.string().optional().nullable().describe('Build finish time'),
          createdAt: z.string().optional().describe('Build creation time'),
          labels: z.array(z.string()).optional().describe('Build labels')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let builds = await client.listBuilds(ctx.input.appId);

    let output = {
      builds: builds.map(b => ({
        buildId: b._id,
        appId: b.appId,
        status: b.status,
        branch: b.branch,
        tag: b.tag,
        workflowId: b.workflowId,
        fileWorkflowId: b.fileWorkflowId,
        instanceType: b.instanceType,
        startedAt: b.startedAt,
        finishedAt: b.finishedAt,
        createdAt: b.createdAt,
        labels: b.labels
      }))
    };

    return {
      output,
      message: `Found **${output.builds.length}** build(s)${ctx.input.appId ? ` for app \`${ctx.input.appId}\`` : ''}.`
    };
  })
  .build();
