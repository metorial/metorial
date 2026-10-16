import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIssuer = SlateTool.create(spec, {
  name: 'Get Issuer',
  key: 'get_issuer',
  description:
    'Retrieve the issuer account associated with your API key, including its organization details and remaining certificate credits.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      issuerId: z.number().describe('Issuer account ID'),
      name: z.string().optional().describe('Issuer organization name'),
      email: z.string().optional().describe('Issuer email address'),
      websiteUrl: z.string().optional().describe('Issuer website'),
      language: z.string().optional().describe('Issuer language'),
      certificatesRemaining: z.number().optional().describe('Remaining certificate credits')
    })
  )
  .handleInvocation(async ctx => {
    let issuer = await new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? (ctx.config as { environment?: string }).environment
    }).getIssuer();
    return {
      output: {
        issuerId: issuer.id,
        name: issuer.name ?? undefined,
        email: issuer.email ?? undefined,
        websiteUrl: issuer.url ?? undefined,
        language: issuer.language ?? undefined,
        certificatesRemaining: issuer.certificate_left ?? undefined
      },
      message: `Retrieved issuer **${issuer.name ?? issuer.id}**.`
    };
  })
  .build();
