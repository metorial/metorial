import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeployRequests = SlateTool.create(spec, {
  name: 'List Deploy Requests',
  key: 'list_deploy_requests',
  description: `List deploy requests for a Vitess database. Deploy requests are similar to pull requests but for database schema changes. Filter by state to find open, deployed, or closed requests.`,
  constraints: [
    'Deploy requests are only available for Vitess (MySQL) databases, not PostgreSQL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      state: z
        .string()
        .optional()
        .describe('Filter by deploy request state (e.g. open, closed, deployed)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      deployRequests: z.array(
        z.object({
          deployRequestId: z.string(),
          number: z.number(),
          branch: z.string().optional(),
          intoBranch: z.string().optional(),
          state: z.string().optional(),
          deploymentState: z.string().optional(),
          approved: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          closedAt: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      currentPage: z.number(),
      nextPage: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let result = await client.listDeployRequests(
      ctx.input.databaseName,
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.state
    );

    let deployRequests = result.data.map((dr: any) => ({
      deployRequestId: dr.id,
      number: dr.number,
      branch: dr.branch,
      intoBranch: dr.into_branch,
      state: dr.state,
      deploymentState: dr.deployment_state,
      approved: dr.approved,
      createdAt: dr.created_at,
      updatedAt: dr.updated_at,
      closedAt: dr.closed_at,
      htmlUrl: dr.html_url
    }));

    return {
      output: {
        deployRequests,
        currentPage: result.currentPage,
        nextPage: result.nextPage
      },
      message: `Found **${deployRequests.length}** deploy request(s) for database **${ctx.input.databaseName}**.`
    };
  });
