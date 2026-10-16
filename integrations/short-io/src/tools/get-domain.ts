import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDomain = SlateTool.create(spec, {
  name: 'Get Domain',
  key: 'get_domain',
  description:
    'Get a domain and its redirect, privacy, HTTPS, and branding settings. Call list_domains to discover domain IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainId: domainIdSchema
    })
  )
  .output(
    z.object({ domain: z.unknown().describe('Complete domain details returned by Short.io.') })
  )
  .handleInvocation(async ctx => {
    let domain = await new Client(ctx.auth).getDomain(ctx.input.domainId);
    return {
      output: { domain },
      message: `Retrieved domain **${domain.hostname}** (${ctx.input.domainId}).`
    };
  })
  .build();
