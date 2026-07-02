import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageProfileOptions = SlateTool.create(spec, {
  name: 'Manage Profile Options',
  key: 'manage_profile_options',
  description: `List all available profile options or update a specific option on a profile. Profile options control behaviors like DNS rebind protection, DNSSEC, IPv4/IPv6 compatibility, AI malware filtering, and TTL settings.`,
  instructions: [
    'Use "list" to see all available options and their descriptions.',
    'Use "update" with a profileId, optionName, and enabled flag to toggle an option.',
    'Common option names: "block_rfc1918" (DNS Rebind Protection), "no_dnssec" (Disable DNSSEC), "spoof_ipv6" (IPv4/IPv6 Compatibility), "ml_filter" (AI Malware Filter).'
  ]
})
  .input(
    z.object({
      operation: z.enum(['list', 'update']).describe('Operation to perform'),
      profileId: z.string().optional().describe('Profile ID (required for update)'),
      optionName: z
        .string()
        .optional()
        .describe('Option name to update (e.g., "block_rfc1918", "no_dnssec")'),
      enabled: z.boolean().optional().describe('Enable or disable the option'),
      value: z
        .string()
        .optional()
        .describe('Optional value for the option (e.g., TTL seconds)')
    })
  )
  .output(
    z.object({
      options: z.array(
        z.object({
          optionId: z.string().describe('Option identifier'),
          title: z.string().describe('Option display title'),
          description: z.string().describe('Option description'),
          type: z.string().describe('Option type (e.g., "toggle")'),
          defaultValue: z.number().describe('Default value')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, optionName, enabled, value } = ctx.input;

    if (operation === 'update') {
      if (!profileId) throw new Error('profileId is required for update');
      if (!optionName) throw new Error('optionName is required for update');
      if (enabled === undefined) throw new Error('enabled is required for update');

      await client.modifyProfileOption(profileId, optionName, {
        status: enabled ? 1 : 0,
        value
      });

      let options = await client.listProfileOptions();
      return {
        output: {
          options: options.map(o => ({
            optionId: o.PK,
            title: o.title,
            description: o.description || '',
            type: o.type,
            defaultValue: o.default_value
          }))
        },
        message: `${enabled ? 'Enabled' : 'Disabled'} option **${optionName}** on profile ${profileId}.`
      };
    }

    // list
    let options = await client.listProfileOptions();
    return {
      output: {
        options: options.map(o => ({
          optionId: o.PK,
          title: o.title,
          description: o.description || '',
          type: o.type,
          defaultValue: o.default_value
        }))
      },
      message: `Found **${options.length}** available profile options.`
    };
  })
  .build();
