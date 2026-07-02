import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

export let manageAgent = SlateTool.create(spec, {
  name: 'Manage Agent Settings',
  key: 'manage_agent',
  description: `View and manage agent settings including source IP addresses and token version configuration. Source IPs are included in KYA and KYA+PAY token claims. Token version controls which token format the agent uses.`,
  instructions: [
    'Use action "get_source_ips" to retrieve current source IP addresses.',
    'Use action "set_source_ips" with sourceIps to update the list.',
    'Use action "get_token_version" to check the current token version.',
    'Use action "set_token_version" with tokenVersion to update it (currently only "1.0" is supported).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get_source_ips', 'set_source_ips', 'get_token_version', 'set_token_version'])
        .describe('The operation to perform'),
      sourceIps: z
        .array(z.string())
        .optional()
        .describe('List of IP addresses to set (for set_source_ips)'),
      tokenVersion: z
        .string()
        .optional()
        .describe('Token version to set (for set_token_version, currently only "1.0")')
    })
  )
  .output(
    z.object({
      sourceIps: z.array(z.string()).optional().describe('Current source IP addresses'),
      tokenVersion: z.string().optional().describe('Current token version'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'get_source_ips') {
      let ips = await client.getSourceIps();
      return {
        output: { sourceIps: ips, success: true },
        message: `Agent has **${ips.length}** source IP(s): ${ips.join(', ') || 'none'}.`
      };
    }

    if (action === 'set_source_ips') {
      if (!ctx.input.sourceIps)
        throw new Error('sourceIps is required for set_source_ips action');
      await client.setSourceIps(ctx.input.sourceIps);
      return {
        output: { sourceIps: ctx.input.sourceIps, success: true },
        message: `Updated source IPs to: ${ctx.input.sourceIps.join(', ')}.`
      };
    }

    if (action === 'get_token_version') {
      let version = await client.getTokenVersion();
      return {
        output: { tokenVersion: version, success: true },
        message: `Agent token version: **${version}**.`
      };
    }

    if (action === 'set_token_version') {
      if (!ctx.input.tokenVersion)
        throw new Error('tokenVersion is required for set_token_version action');
      await client.setTokenVersion(ctx.input.tokenVersion);
      return {
        output: { tokenVersion: ctx.input.tokenVersion, success: true },
        message: `Updated token version to **${ctx.input.tokenVersion}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
