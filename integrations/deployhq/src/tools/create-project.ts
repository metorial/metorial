import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateInteger } from '../lib/client';
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
      zoneIdentifier: z
        .string()
        .optional()
        .describe('Zone identifier from list_zones; takes precedence over legacy zoneId'),
      zoneId: z
        .number()
        .optional()
        .describe('Legacy numeric deployment zone ID. Prefer zoneIdentifier from list_zones.')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Project name'),
      projectIdentifier: z.string().optional().describe('Stable project identifier'),
      zone: z.string().optional().describe('Deployment zone identifier'),
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

    validateInteger(ctx.input.zoneId, 'zoneId', 1);
    let p = await client.createProject({
      name: ctx.input.name,
      zoneId: ctx.input.zoneId,
      zoneIdentifier: ctx.input.zoneIdentifier
    });

    return {
      output: {
        name: p.name,
        projectIdentifier: p.identifier,
        zone: p.zone,
        permalink: p.permalink,
        zoneId: p.zone_id,
        publicKey: p.public_key
      },
      message: `Created project **${p.name}** with permalink \`${p.permalink}\`.`
    };
  })
  .build();
