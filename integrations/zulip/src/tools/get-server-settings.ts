import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getServerSettings = SlateTool.create(spec, {
  name: 'Get Server Settings',
  key: 'get_server_settings',
  description:
    'Get the connected Zulip server version, API feature level, organization identity, and supported authentication methods.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      version: z.string().optional().describe('Zulip server version'),
      featureLevel: z
        .number()
        .optional()
        .describe('API feature level advertised by the server'),
      realmName: z.string().optional().describe('Organization name'),
      realmUrl: z.string().optional().describe('Organization URL'),
      raw: z.any().describe('Complete provider settings response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getServerSettings();
    return {
      output: {
        version: result.zulip_version,
        featureLevel: result.zulip_feature_level,
        realmName: result.realm_name,
        realmUrl: result.realm_url ?? result.realm_uri,
        raw: result
      },
      message: 'Retrieved Zulip server settings'
    };
  })
  .build();
