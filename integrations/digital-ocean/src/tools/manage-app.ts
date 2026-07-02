import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appSchema = z.object({
  appId: z.string().describe('App ID'),
  name: z.string().describe('App name'),
  defaultIngress: z.string().optional().describe('Default app URL'),
  liveUrl: z.string().optional().describe('Live URL for the app'),
  region: z.string().optional().describe('Region slug'),
  tierSlug: z.string().optional().describe('Pricing tier'),
  activeDeploymentId: z.string().optional().describe('Current active deployment ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all App Platform applications. Returns app names, URLs, regions, and deployment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      apps: z.array(appSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listApps({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: {
        apps: result.apps.map((a: any) => ({
          appId: a.id,
          name: a.spec?.name || '',
          defaultIngress: a.default_ingress,
          liveUrl: a.live_url,
          region: a.region?.slug,
          tierSlug: a.tier_slug,
          activeDeploymentId: a.active_deployment?.id,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }))
      },
      message: `Found **${result.apps.length}** App Platform application(s).`
    };
  })
  .build();

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Get detailed information about an App Platform application, including its full specification, deployment status, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('App ID')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('App ID'),
      name: z.string().describe('App name'),
      defaultIngress: z.string().optional().describe('Default app URL'),
      liveUrl: z.string().optional().describe('Live URL'),
      region: z.string().optional().describe('Region slug'),
      tierSlug: z.string().optional().describe('Pricing tier'),
      activeDeploymentId: z.string().optional().describe('Current deployment ID'),
      activeDeploymentPhase: z.string().optional().describe('Current deployment phase'),
      appSpec: z.any().optional().describe('Full app specification'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let a = await client.getApp(ctx.input.appId);

    return {
      output: {
        appId: a.id,
        name: a.spec?.name || '',
        defaultIngress: a.default_ingress,
        liveUrl: a.live_url,
        region: a.region?.slug,
        tierSlug: a.tier_slug,
        activeDeploymentId: a.active_deployment?.id,
        activeDeploymentPhase: a.active_deployment?.phase,
        appSpec: a.spec,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      },
      message: `Retrieved App **${a.spec?.name || a.id}** — ${a.live_url || 'no live URL'}.`
    };
  })
  .build();

export let deployApp = SlateTool.create(spec, {
  name: 'Deploy App',
  key: 'deploy_app',
  description: `Trigger a new deployment for an App Platform application. This rebuilds and redeploys all components from the latest source.`
})
  .input(
    z.object({
      appId: z.string().describe('App ID to deploy')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('ID of the new deployment'),
      phase: z.string().optional().describe('Initial deployment phase'),
      createdAt: z.string().describe('Deployment creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let deployment = await client.createAppDeployment(ctx.input.appId);

    return {
      output: {
        deploymentId: deployment.id,
        phase: deployment.phase,
        createdAt: deployment.created_at
      },
      message: `Triggered deployment **${deployment.id}** for app **${ctx.input.appId}**.`
    };
  })
  .build();

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Permanently delete an App Platform application and all its components and deployments.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('App ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the app was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteApp(ctx.input.appId);

    return {
      output: { deleted: true },
      message: `Deleted App **${ctx.input.appId}**.`
    };
  })
  .build();
