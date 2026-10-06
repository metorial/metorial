import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
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
      organization: organizationInput,
      projectName: z.string().optional().describe('Project name (omit for org-wide listing)'),
      stackName: z.string().optional().describe('Stack name (omit for org-wide listing)'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter the fetched page by status locally; provider totals include all statuses'
        ),
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
      ),
      page: z.number().optional(),
      pageSize: z.number().optional(),
      returnedCount: z.number().optional(),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total before the optional local status filter'),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    if (!!ctx.input.projectName !== !!ctx.input.stackName)
      throw createApiServiceError(
        'Provide both projectName and stackName for a stack listing, or omit both for the organization.'
      );
    let result: Awaited<ReturnType<Client['listDeployments']>>;
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

    let deployments = result.deployments.map(d => ({
      deploymentId: d.id,
      version: d.version,
      status: d.status,
      operation: d.pulumiOperation ?? d.operation,
      projectName: d.projectName,
      stackName: d.stackName,
      created: d.created
    }));

    let scope =
      ctx.input.projectName && ctx.input.stackName
        ? `stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
        : `organization **${org}**`;

    return {
      output: {
        deployments,
        page: result.page,
        pageSize: result.itemsPerPage ?? result.pageSize,
        returnedCount: deployments.length,
        totalCount: result.total,
        hasMore:
          result.total !== undefined
            ? result.page * (result.itemsPerPage ?? result.pageSize) < result.total
            : undefined
      },
      message: `Found **${deployments.length}** deployment(s) for ${scope}`
    };
  })
  .build();
