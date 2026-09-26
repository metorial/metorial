import { SlateTool } from 'slates';
import { z } from 'zod';
import { getOracleIdentityProfile } from '../lib/identity';
import { spec } from '../spec';

export let whoAmITool = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Who Am I',
  description:
    'Retrieve the authenticated Oracle user identity and the connected Fusion instance. Application resource access also depends on the user’s Oracle roles.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      id: z
        .string()
        .describe('Stable user identity combining the identity domain and subject.'),
      subject: z.string().describe('User subject identifier issued by the identity domain.'),
      name: z.string().describe('Display name of the authenticated Oracle user.'),
      email: z
        .string()
        .optional()
        .describe('Email address supplied by the identity domain, when available.'),
      username: z
        .string()
        .optional()
        .describe('Preferred username supplied by the identity domain.'),
      imageUrl: z
        .string()
        .optional()
        .describe('Profile image URL supplied by the identity domain, when available.'),
      identityDomainUrl: z
        .string()
        .describe('HTTPS origin of the connected Oracle identity domain.'),
      instanceUrl: z.string().describe('HTTPS origin of the connected Oracle Fusion instance.')
    })
  )
  .handleInvocation(async ctx => ({
    output: await getOracleIdentityProfile(ctx.auth),
    message: 'Retrieved the authenticated Oracle user.'
  }))
  .build();
