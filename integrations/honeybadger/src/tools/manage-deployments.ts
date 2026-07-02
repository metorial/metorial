import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { HoneybadgerReportingClient } from '../lib/reporting-client';
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
  description: `List, record, or delete deployments for a Honeybadger project. Recording a new deployment uses the Reporting API and requires a project API key. Listing and deleting use the Data API.`,
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
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      projectId: z.string().describe('Project ID'),
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
      limit: z.number().optional().describe('Max results for list (max 25)')
    })
  )
  .output(
    z.object({
      deployments: z.array(deploySchema).optional().describe('List of deployments'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
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
          limit
        });
        let deployments = (data.results || []).map((d: any) => ({
          deployId: d.id,
          environment: d.environment,
          revision: d.revision,
          repository: d.repository,
          localUsername: d.local_username,
          createdAt: d.created_at
        }));
        return {
          output: { deployments, success: true },
          message: `Found **${deployments.length}** deployment(s).`
        };
      }

      case 'create': {
        if (!ctx.auth.projectToken) {
          throw new Error(
            'A project API key is required to record deployments. Configure it in your authentication settings.'
          );
        }
        let reportingClient = new HoneybadgerReportingClient({
          projectToken: ctx.auth.projectToken
        });
        await reportingClient.reportDeploy({
          environment,
          revision,
          repository,
          localUsername
        });
        return {
          output: { success: true },
          message: `Recorded deployment${environment ? ` to **${environment}**` : ''}${revision ? ` (rev: ${revision})` : ''}.`
        };
      }

      case 'delete': {
        if (!deployId) throw new Error('deployId is required for delete action');
        await client.deleteDeploy(projectId, deployId);
        return {
          output: { success: true },
          message: `Deleted deployment **${deployId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
