import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSystem = SlateTool.create(spec, {
  name: 'Manage System',
  key: 'manage_system',
  description: `Update or delete a JumpCloud-managed system (device). Systems are registered automatically when the JumpCloud agent is installed, so this tool only supports updates and deletion. Update display name, SSH settings, MFA configuration, and other system properties.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('Action to perform'),
      systemId: z.string().describe('JumpCloud system ID'),
      displayName: z.string().optional().describe('New display name for the system'),
      allowMultiFactorAuthentication: z
        .boolean()
        .optional()
        .describe('Allow MFA for this system'),
      allowPublicKeyAuthentication: z
        .boolean()
        .optional()
        .describe('Allow public key authentication'),
      allowSshPasswordAuthentication: z
        .boolean()
        .optional()
        .describe('Allow SSH password authentication'),
      allowSshRootLogin: z.boolean().optional().describe('Allow SSH root login')
    })
  )
  .output(
    z.object({
      systemId: z.string().describe('System ID'),
      displayName: z.string().optional().describe('Display name'),
      hostname: z.string().optional().describe('Hostname'),
      os: z.string().optional().describe('Operating system'),
      active: z.boolean().optional().describe('Whether active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let system: any;
    let actionMessage: string;

    if (ctx.input.action === 'update') {
      let data: Record<string, any> = {};
      if (ctx.input.displayName !== undefined) data.displayName = ctx.input.displayName;
      if (ctx.input.allowMultiFactorAuthentication !== undefined)
        data.allowMultiFactorAuthentication = ctx.input.allowMultiFactorAuthentication;
      if (ctx.input.allowPublicKeyAuthentication !== undefined)
        data.allowPublicKeyAuthentication = ctx.input.allowPublicKeyAuthentication;
      if (ctx.input.allowSshPasswordAuthentication !== undefined)
        data.allowSshPasswordAuthentication = ctx.input.allowSshPasswordAuthentication;
      if (ctx.input.allowSshRootLogin !== undefined)
        data.allowSshRootLogin = ctx.input.allowSshRootLogin;

      system = await client.updateSystem(ctx.input.systemId, data);
      actionMessage = `Updated system **${system.displayName ?? system.hostname}**`;
    } else {
      system = await client.deleteSystem(ctx.input.systemId);
      actionMessage = `Deleted system **${system.displayName ?? system.hostname}**`;
    }

    return {
      output: {
        systemId: system._id,
        displayName: system.displayName,
        hostname: system.hostname,
        os: system.os,
        active: system.active
      },
      message: actionMessage
    };
  })
  .build();
