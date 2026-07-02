import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Retrieve information about your PhantomBuster workspace (organization), including plan details, resource quotas, and storage usage.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceId: z.string().describe('Workspace/organization ID'),
      name: z.string().optional().describe('Workspace name'),
      timezone: z.string().optional().describe('Workspace timezone'),
      planSlug: z.string().optional().describe('Current plan identifier'),
      s3Folder: z.string().optional().describe('Cloud storage folder path'),
      dailyExecutionTime: z.number().optional().describe('Daily execution time quota'),
      storageLeft: z.number().optional().describe('Remaining storage'),
      createdAt: z.number().optional().describe('Timestamp when the workspace was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let org = await client.fetchOrg();

    return {
      output: {
        workspaceId: String(org.id),
        name: org.name ?? undefined,
        timezone: org.timezone ?? undefined,
        planSlug: org.planSlug ?? undefined,
        s3Folder: org.s3Folder ?? undefined,
        dailyExecutionTime: org.dailyExecutionTime ?? undefined,
        storageLeft: org.s3Storage ?? undefined,
        createdAt: org.createdAt ?? undefined
      },
      message: `Workspace: **${org.name ?? org.id}** (Plan: ${org.planSlug ?? 'unknown'}).`
    };
  })
  .build();
