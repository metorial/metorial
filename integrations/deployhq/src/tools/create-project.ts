import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new DeployHQ project. After creation, you can configure the repository and add servers.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new project'),
      zoneId: z
        .number()
        .optional()
        .describe('Deployment region: 3 = UK (default), 6 = US East, 9 = US West')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Project name'),
      permalink: z.string().describe('URL-friendly project identifier'),
      zoneId: z.number().optional().describe('Deployment zone ID'),
      publicKey: z.string().optional().describe('SSH public key for the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let p = await client.createProject({
      name: ctx.input.name,
      zoneId: ctx.input.zoneId
    });

    return {
      output: {
        name: p.name,
        permalink: p.permalink,
        zoneId: p.zone_id,
        publicKey: p.public_key
      },
      message: `Created project **${p.name}** with permalink \`${p.permalink}\`.`
    };
  })
  .build();
