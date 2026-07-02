import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSite = SlateTool.create(spec, {
  name: 'Get Site',
  key: 'get_site',
  description: `Retrieve detailed information about a specific Netlify site, including build settings, repository configuration, deploy settings, and domain information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('The site ID or custom domain of the site to retrieve')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('Unique site identifier'),
      name: z.string().describe('Site name'),
      url: z.string().describe('Primary site URL'),
      sslUrl: z.string().optional().describe('SSL URL of the site'),
      adminUrl: z.string().optional().describe('Netlify admin URL'),
      customDomain: z.string().optional().describe('Custom domain if configured'),
      domainAliases: z.array(z.string()).optional().describe('List of domain aliases'),
      state: z.string().optional().describe('Current site state'),
      createdAt: z.string().optional().describe('Site creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      accountSlug: z.string().optional().describe('Account slug the site belongs to'),
      accountName: z.string().optional().describe('Account name'),
      buildSettings: z
        .object({
          repoUrl: z.string().optional().describe('Repository URL'),
          repoBranch: z.string().optional().describe('Repository branch'),
          cmd: z.string().optional().describe('Build command'),
          dir: z.string().optional().describe('Publish directory'),
          functionsDir: z.string().optional().describe('Functions directory')
        })
        .optional()
        .describe('Build configuration settings'),
      publishedDeploy: z
        .object({
          deployId: z.string().describe('Deploy ID'),
          state: z.string().optional().describe('Deploy state'),
          publishedAt: z.string().optional().describe('Publish timestamp')
        })
        .optional()
        .describe('Currently published deploy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let site = await client.getSite(ctx.input.siteId);

    let output: any = {
      siteId: site.id,
      name: site.name || '',
      url: site.url || '',
      sslUrl: site.ssl_url ?? undefined,
      adminUrl: site.admin_url ?? undefined,
      customDomain: site.custom_domain ?? undefined,
      domainAliases: site.domain_aliases ?? undefined,
      state: site.state ?? undefined,
      createdAt: site.created_at ?? undefined,
      updatedAt: site.updated_at ?? undefined,
      accountSlug: site.account_slug ?? undefined,
      accountName: site.account_name ?? undefined
    };

    if (site.build_settings) {
      output.buildSettings = {
        repoUrl: site.build_settings.repo_url ?? undefined,
        repoBranch: site.build_settings.repo_branch ?? undefined,
        cmd: site.build_settings.cmd ?? undefined,
        dir: site.build_settings.dir ?? undefined,
        functionsDir: site.build_settings.functions_dir ?? undefined
      };
    }

    if (site.published_deploy) {
      output.publishedDeploy = {
        deployId: site.published_deploy.id,
        state: site.published_deploy.state ?? undefined,
        publishedAt: site.published_deploy.published_at ?? undefined
      };
    }

    return {
      output,
      message: `Retrieved site **${output.name}** (${output.url}).`
    };
  })
  .build();
