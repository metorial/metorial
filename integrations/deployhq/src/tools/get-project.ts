import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific DeployHQ project by its permalink. Includes repository info, public key, and deployment zone.`,
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
      name: z.string().describe('Project name'),
      permalink: z.string().describe('URL-friendly project identifier'),
      zoneId: z.number().optional().describe('Deployment zone ID'),
      publicKey: z.string().optional().describe('SSH public key for the project'),
      lastDeployedAt: z
        .string()
        .nullable()
        .optional()
        .describe('Timestamp of last deployment'),
      autoDeployUrl: z.string().optional().describe('Webhook URL for automatic deployments'),
      repository: z
        .object({
          scmType: z.string().optional(),
          url: z.string().optional(),
          branch: z.string().optional(),
          cached: z.boolean().optional()
        })
        .nullable()
        .optional()
        .describe('Repository configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let p = await client.getProject(ctx.input.projectPermalink);

    return {
      output: {
        name: p.name,
        permalink: p.permalink,
        zoneId: p.zone_id,
        publicKey: p.public_key,
        lastDeployedAt: p.last_deployed_at ?? null,
        autoDeployUrl: p.auto_deploy_url,
        repository: p.repository
          ? {
              scmType: p.repository.scm_type,
              url: p.repository.url,
              branch: p.repository.branch,
              cached: p.repository.cached
            }
          : null
      },
      message: `Retrieved project **${p.name}** (\`${p.permalink}\`).`
    };
  })
  .build();
