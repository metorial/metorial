import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let manageTrustedIps = SlateTool.create(spec, {
  name: 'Manage Trusted IPs',
  key: 'manage_trusted_ips',
  description: `List, add, or remove trusted IP ranges for a Doppler config. Trusted IPs restrict which source IPs can access secrets for a given config. IP ranges use CIDR notation (e.g., "192.168.1.0/24"). The default "0.0.0.0/0" allows all traffic.`,
  instructions: [
    'Use action "list" to view current trusted IP ranges for a config.',
    'Use action "add" to whitelist a new IP or CIDR range.',
    'Use action "delete" to remove a trusted IP range.'
  ],
  constraints: [
    'Only workplace Admins can manage trusted IPs.',
    'IP ranges must be in CIDR notation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug'),
      config: z.string().describe('Config name'),
      action: z.enum(['list', 'add', 'delete']).describe('Action to perform'),
      ip: z
        .string()
        .optional()
        .describe('IP address or CIDR range (required for add and delete)')
    })
  )
  .output(
    z.object({
      ips: z.array(z.string()).optional().describe('List of trusted IP ranges')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let ips = await client.listTrustedIps(ctx.input.project, ctx.input.config);

      return {
        output: { ips: ips.map((ip: any) => (typeof ip === 'string' ? ip : ip.ip)) },
        message: `Found **${ips.length}** trusted IP range(s) for **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.ip) throw new Error('ip is required for "add" action');

      await client.addTrustedIp(ctx.input.project, ctx.input.config, ctx.input.ip);

      return {
        output: {},
        message: `Added trusted IP **${ctx.input.ip}** to **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.ip) throw new Error('ip is required for "delete" action');

      await client.deleteTrustedIp(ctx.input.project, ctx.input.config, ctx.input.ip);

      return {
        output: {},
        message: `Removed trusted IP **${ctx.input.ip}** from **${ctx.input.project}/${ctx.input.config}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
