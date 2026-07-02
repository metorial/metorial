import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the full configuration of a specific NextDNS profile, including security settings, privacy settings, parental controls, allowlist, denylist, rewrites, and operational settings. Use this to inspect the complete state of a profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile to retrieve')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID'),
      name: z.string().describe('Profile name'),
      security: z.record(z.string(), z.unknown()).describe('Security configuration'),
      privacy: z
        .record(z.string(), z.unknown())
        .describe('Privacy and ad-blocking configuration'),
      parentalControl: z
        .record(z.string(), z.unknown())
        .describe('Parental control configuration'),
      denylist: z.array(z.record(z.string(), z.unknown())).describe('Denied domains'),
      allowlist: z.array(z.record(z.string(), z.unknown())).describe('Allowed domains'),
      rewrites: z.array(z.record(z.string(), z.unknown())).describe('DNS rewrite rules'),
      settings: z.record(z.string(), z.unknown()).describe('Profile operational settings'),
      setup: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Setup and connection information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let result = await client.getProfile(ctx.input.profileId);
    let data = result.data || result;

    return {
      output: {
        profileId: ctx.input.profileId,
        name: data.name,
        security: data.security || {},
        privacy: data.privacy || {},
        parentalControl: data.parentalControl || {},
        denylist: data.denylist || [],
        allowlist: data.allowlist || [],
        rewrites: data.rewrites || [],
        settings: data.settings || {},
        setup: data.setup
      },
      message: `Retrieved profile **${data.name}** (${ctx.input.profileId}).`
    };
  })
  .build();
