import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let deploymentSummarySchema = z.object({
  deploymentIdentifier: z.string().describe('Unique deployment identifier'),
  status: z.string().describe('Deployment status'),
  deployer: z.string().optional().describe('Who triggered the deployment'),
  branch: z.string().optional().describe('Deployed branch'),
  endRevision: z.string().optional().describe('End revision ref'),
  queuedAt: z.string().optional().describe('When the deployment was queued'),
  startedAt: z.string().nullable().optional().describe('When the deployment started'),
  completedAt: z.string().nullable().optional().describe('When the deployment completed')
});

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List recent deployments for a DeployHQ project. Returns deployment status, deployer, branch, revision, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project')
    })
  )
  .output(
    z.object({
      deployments: z.array(deploymentSummarySchema).describe('List of deployments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let deployments = await client.listDeployments(ctx.input.projectPermalink);

    let mapped = (Array.isArray(deployments) ? deployments : []).map((d: any) => ({
      deploymentIdentifier: d.identifier,
      status: d.status,
      deployer: d.deployer,
      branch: d.branch,
      endRevision: d.end_revision?.ref,
      queuedAt: d.queued_at,
      startedAt: d.started_at ?? null,
      completedAt: d.completed_at ?? null
    }));

    return {
      output: { deployments: mapped },
      message: `Found **${mapped.length}** deployment(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();
