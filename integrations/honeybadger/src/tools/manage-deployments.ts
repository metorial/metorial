import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { HoneybadgerReportingClient } from '../lib/reporting-client';
import type { Deploy } from '../lib/types';
import { nextUrlSchema, projectIdSchema } from '../lib/validation';
import { spec } from '../spec';

let deploySchema = z.object({
  deployId: z.number().optional().describe('Deployment ID'),
  environment: z.string().optional().describe('Deployment environment'),
  revision: z.string().optional().describe('Revision/commit hash'),
  repository: z.string().optional().describe('Repository URL'),
  localUsername: z.string().optional().describe('User who deployed'),
  createdAt: z.string().optional().describe('When the deployment was recorded')
});

export let manageDeployments = SlateTool.create(spec, {
  name: 'Manage Deployments',
  key: 'manage_deployments',
  description: `List, record, or delete deployments for a Honeybadger project. Recording a new deployment uses the Reporting API and requires the selected project’s primary API key. Listing and deleting use the Data API. Reporting targets the configured primary project key and may resolve errors or send notifications according to project settings.`,
  instructions: [
    'To record a deployment, provide the action "create" and ensure a project API key is configured in authentication.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      nextUrl: nextUrlSchema,
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      projectId: projectIdSchema,
      deployId: z.string().optional().describe('Deployment ID (required for delete)'),
      environment: z
        .string()
        .optional()
        .describe('Deployment environment (for list filter or create)'),
      revision: z.string().optional().describe('Revision/commit hash (for create)'),
      repository: z.string().optional().describe('Repository URL (for create)'),
      localUsername: z
        .string()
        .optional()
        .describe('Username of who deployed (for list filter or create)'),
      createdAfter: z
        .number()
        .optional()
        .describe('List deployments created after this Unix timestamp'),
      createdBefore: z
        .number()
        .optional()
        .describe('List deployments created before this Unix timestamp'),
      limit: z.number().optional().describe('Max results for list (max 25)')
    })
  )
  .output(
    z.object({
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      deployments: z.array(deploySchema).optional().describe('List of deployments'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let {
      action,
      projectId,
      deployId,
      environment,
      revision,
      repository,
      localUsername,
      limit
    } = ctx.input;

    switch (action) {
      case 'list': {
        let data = await client.listDeploys(projectId, {
          environment,
          localUsername,
          nextUrl: ctx.input.nextUrl,
          createdAfter: ctx.input.createdAfter,
          createdBefore: ctx.input.createdBefore,
          limit
        });
        let deployments = (data.results || []).map((d: Deploy) => ({
          deployId: d.id ?? undefined,
          environment: d.environment ?? undefined,
          revision: d.revision ?? undefined,
          repository: d.repository ?? undefined,
          localUsername: d.local_username ?? undefined,
          createdAt: d.created_at ?? undefined
        }));
        return {
          output: { deployments, nextUrl: data.links?.next ?? undefined, success: true },
          message: `Found **${deployments.length}** deployment(s).`
        };
      }

      case 'create': {
        if (!ctx.auth.projectToken) {
          throw createApiServiceError(
            'A project API key is required to record deployments. Configure it in your authentication settings.'
          );
        }
        await client.verifyReportingProject(projectId, ctx.auth.projectToken);
        let reportingClient = new HoneybadgerReportingClient({
          projectToken: ctx.auth.projectToken,
          region: ctx.auth.region
        });
        await reportingClient.reportDeploy({
          environment,
          revision,
          repository,
          localUsername
        });
        return {
          output: { success: true },
          message: `Accepted deployment report${environment ? ` to **${environment}**` : ''}${revision ? ` (rev: ${revision})` : ''}.`
        };
      }

      case 'delete': {
        if (!deployId) throw createApiServiceError('deployId is required for delete action');
        await client.deleteDeploy(projectId, deployId);
        return {
          output: { success: true },
          message: `Deleted deployment **${deployId}**.`
        };
      }

      default:
        throw createApiServiceError(`Unknown action: ${action}`);
    }
  })
  .build();
