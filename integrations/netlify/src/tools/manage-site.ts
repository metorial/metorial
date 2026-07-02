import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSite = SlateTool.create(spec, {
  name: 'Create Site',
  key: 'create_site',
  description: `Create a new Netlify site. Optionally link it to a Git repository and configure build settings. The site can be created under a specific team account.`
})
  .input(
    z.object({
      name: z.string().optional().describe('Site name (used as subdomain: name.netlify.app)'),
      customDomain: z.string().optional().describe('Custom domain for the site'),
      accountSlug: z
        .string()
        .optional()
        .describe('Account/team slug to create the site under'),
      repoUrl: z.string().optional().describe('Git repository URL to link'),
      repoBranch: z.string().optional().describe('Repository branch to deploy from'),
      buildCommand: z.string().optional().describe('Build command to run'),
      publishDirectory: z.string().optional().describe('Directory to publish after build'),
      functionsDirectory: z.string().optional().describe('Directory for serverless functions')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('Unique site identifier'),
      name: z.string().describe('Site name'),
      url: z.string().describe('Primary site URL'),
      sslUrl: z.string().optional().describe('SSL URL of the site'),
      adminUrl: z.string().optional().describe('Netlify admin URL'),
      state: z.string().optional().describe('Current site state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.customDomain) body.custom_domain = ctx.input.customDomain;

    let buildSettings: Record<string, any> = {};
    if (ctx.input.repoUrl) buildSettings.repo_url = ctx.input.repoUrl;
    if (ctx.input.repoBranch) buildSettings.repo_branch = ctx.input.repoBranch;
    if (ctx.input.buildCommand) buildSettings.cmd = ctx.input.buildCommand;
    if (ctx.input.publishDirectory) buildSettings.dir = ctx.input.publishDirectory;
    if (ctx.input.functionsDirectory)
      buildSettings.functions_dir = ctx.input.functionsDirectory;

    if (Object.keys(buildSettings).length > 0) {
      body.build_settings = buildSettings;
    }

    let site = await client.createSite(body, ctx.input.accountSlug);

    return {
      output: {
        siteId: site.id,
        name: site.name || '',
        url: site.url || '',
        sslUrl: site.ssl_url,
        adminUrl: site.admin_url,
        state: site.state
      },
      message: `Created site **${site.name}** (${site.url}).`
    };
  })
  .build();

export let updateSite = SlateTool.create(spec, {
  name: 'Update Site',
  key: 'update_site',
  description: `Update configuration of an existing Netlify site. Modify site name, custom domain, build settings, and repository linking.`
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to update'),
      name: z.string().optional().describe('New site name'),
      customDomain: z.string().optional().describe('New custom domain'),
      repoUrl: z.string().optional().describe('Git repository URL'),
      repoBranch: z.string().optional().describe('Repository branch'),
      buildCommand: z.string().optional().describe('Build command'),
      publishDirectory: z.string().optional().describe('Publish directory'),
      functionsDirectory: z.string().optional().describe('Functions directory')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('Unique site identifier'),
      name: z.string().describe('Updated site name'),
      url: z.string().describe('Primary site URL'),
      sslUrl: z.string().optional().describe('SSL URL of the site'),
      adminUrl: z.string().optional().describe('Netlify admin URL'),
      state: z.string().optional().describe('Current site state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.customDomain !== undefined) body.custom_domain = ctx.input.customDomain;

    let buildSettings: Record<string, any> = {};
    if (ctx.input.repoUrl !== undefined) buildSettings.repo_url = ctx.input.repoUrl;
    if (ctx.input.repoBranch !== undefined) buildSettings.repo_branch = ctx.input.repoBranch;
    if (ctx.input.buildCommand !== undefined) buildSettings.cmd = ctx.input.buildCommand;
    if (ctx.input.publishDirectory !== undefined)
      buildSettings.dir = ctx.input.publishDirectory;
    if (ctx.input.functionsDirectory !== undefined)
      buildSettings.functions_dir = ctx.input.functionsDirectory;

    if (Object.keys(buildSettings).length > 0) {
      body.build_settings = buildSettings;
    }

    let site = await client.updateSite(ctx.input.siteId, body);

    return {
      output: {
        siteId: site.id,
        name: site.name || '',
        url: site.url || '',
        sslUrl: site.ssl_url,
        adminUrl: site.admin_url,
        state: site.state
      },
      message: `Updated site **${site.name}**.`
    };
  })
  .build();

export let deleteSite = SlateTool.create(spec, {
  name: 'Delete Site',
  key: 'delete_site',
  description: `Permanently delete a Netlify site. This action cannot be undone and will remove the site, all deploys, and associated resources.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the site was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSite(ctx.input.siteId);

    return {
      output: { deleted: true },
      message: `Deleted site **${ctx.input.siteId}**.`
    };
  })
  .build();
