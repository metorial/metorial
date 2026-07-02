import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { netlifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let deployOutputSchema = z.object({
  deployId: z.string().describe('Unique deploy identifier'),
  siteId: z.string().describe('Site ID this deploy belongs to'),
  state: z.string().optional().describe('Deploy state (e.g., ready, building, error)'),
  name: z.string().optional().describe('Deploy name'),
  url: z.string().optional().describe('Deploy URL'),
  sslUrl: z.string().optional().describe('Deploy SSL URL'),
  branch: z.string().optional().describe('Git branch for this deploy'),
  commitRef: z.string().optional().describe('Git commit reference'),
  commitUrl: z.string().optional().describe('URL to the commit'),
  title: z.string().optional().describe('Deploy title/message'),
  context: z
    .string()
    .optional()
    .describe('Deploy context (production, deploy-preview, branch-deploy)'),
  createdAt: z.string().optional().describe('Deploy creation timestamp'),
  publishedAt: z.string().optional().describe('Deploy publish timestamp'),
  errorMessage: z.string().optional().describe('Error message if deploy failed')
});

let mapDeploy = (deploy: any) => ({
  deployId: deploy.id,
  siteId: deploy.site_id,
  state: deploy.state ?? undefined,
  name: deploy.name ?? undefined,
  url: deploy.deploy_url ?? deploy.url ?? undefined,
  sslUrl: deploy.deploy_ssl_url ?? deploy.ssl_url ?? undefined,
  branch: deploy.branch ?? undefined,
  commitRef: deploy.commit_ref ?? undefined,
  commitUrl: deploy.commit_url ?? undefined,
  title: deploy.title ?? undefined,
  context: deploy.context ?? undefined,
  createdAt: deploy.created_at ?? undefined,
  publishedAt: deploy.published_at ?? undefined,
  errorMessage: deploy.error_message ?? undefined
});

export let listDeploys = SlateTool.create(spec, {
  name: 'List Deploys',
  key: 'list_deploys',
  description: `List deploys for a Netlify site. Returns deploy history with state, branch, and commit information. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to list deploys for'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of deploys per page')
    })
  )
  .output(
    z.object({
      deploys: z.array(deployOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let deploys = await client.listDeploys(ctx.input.siteId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = deploys.map(mapDeploy);

    return {
      output: { deploys: mapped },
      message: `Found **${mapped.length}** deploy(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let getDeploy = SlateTool.create(spec, {
  name: 'Get Deploy',
  key: 'get_deploy',
  description: `Get detailed information about a specific deploy, including its state, URL, commit information, and error details if applicable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deployId: z.string().describe('The deploy ID to retrieve')
    })
  )
  .output(deployOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let deploy = await client.getDeploy(ctx.input.deployId);

    return {
      output: mapDeploy(deploy),
      message: `Retrieved deploy **${deploy.id}** (state: ${deploy.state}).`
    };
  })
  .build();

export let manageDeploy = SlateTool.create(spec, {
  name: 'Manage Deploy',
  key: 'manage_deploy',
  description: `Perform actions on a deploy: cancel a running build, lock/unlock auto-publishing, restore a previous deploy, or delete a deploy.`,
  instructions: [
    'Use "lock" to pin the site to a specific deploy and stop auto-publishing.',
    'Use "unlock" to resume auto-publishing new deploys.',
    'Use "restore" to re-publish a previous deploy (rollback). Requires siteId.',
    'Use "cancel" to stop a running build.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['cancel', 'lock', 'unlock', 'restore', 'delete'])
        .describe('Action to perform on the deploy'),
      deployId: z.string().describe('The deploy ID to act on'),
      siteId: z.string().optional().describe('Site ID (required for restore action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      deploy: deployOutputSchema
        .optional()
        .describe('Updated deploy information (not returned for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let deploy: any;

    switch (ctx.input.action) {
      case 'cancel':
        deploy = await client.cancelDeploy(ctx.input.deployId);
        break;
      case 'lock':
        deploy = await client.lockDeploy(ctx.input.deployId);
        break;
      case 'unlock':
        deploy = await client.unlockDeploy(ctx.input.deployId);
        break;
      case 'restore':
        if (!ctx.input.siteId) {
          throw netlifyServiceError('siteId is required for the restore action');
        }
        deploy = await client.restoreDeploy(ctx.input.siteId, ctx.input.deployId);
        break;
      case 'delete':
        await client.deleteDeploy(ctx.input.deployId);
        return {
          output: { success: true },
          message: `Deleted deploy **${ctx.input.deployId}**.`
        };
    }

    return {
      output: {
        success: true,
        deploy: deploy ? mapDeploy(deploy) : undefined
      },
      message: `Performed **${ctx.input.action}** on deploy **${ctx.input.deployId}**.`
    };
  })
  .build();
