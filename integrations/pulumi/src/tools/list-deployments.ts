import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List deployments for a specific stack or across an entire organization. Useful for monitoring deployment history and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().optional().describe('Project name (omit for org-wide listing)'),
      stackName: z.string().optional().describe('Stack name (omit for org-wide listing)'),
      status: z.string().optional().describe('Filter by deployment status'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (1-100, default 10)')
    })
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          deploymentId: z.string().optional(),
          version: z.number().optional(),
          status: z.string().optional(),
          operation: z.string().optional(),
          projectName: z.string().optional(),
          stackName: z.string().optional(),
          created: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result: any;
    if (ctx.input.projectName && ctx.input.stackName) {
      result = await client.listDeployments(org, ctx.input.projectName, ctx.input.stackName, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        status: ctx.input.status
      });
    } else {
      result = await client.listOrgDeployments(org, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        status: ctx.input.status
      });
    }

    let deployments = (result.deployments || []).map((d: any) => ({
      deploymentId: d.id,
      version: d.version,
      status: d.status,
      operation: d.operation,
      projectName: d.projectName,
      stackName: d.stackName,
      created: d.created
    }));

    let scope =
      ctx.input.projectName && ctx.input.stackName
        ? `stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
        : `organization **${org}**`;

    return {
      output: { deployments },
      message: `Found **${deployments.length}** deployment(s) for ${scope}`
    };
  })
  .build();
