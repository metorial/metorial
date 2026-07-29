import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getGlobalSecurityAdvisory = SlateTool.create(spec, {
  name: 'Get a Global Security Advisory',
  key: 'get_global_security_advisory',
  description: 'Get a global security advisory.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'security_events'))
  .input(
    z.object({
      ghsaId: z.string().describe('GitHub Security Advisory ID (format: GHSA-xxxx-xxxx-xxxx).')
    })
  )
  .output(
    z.object({
      advisory: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let advisory = await client.getGlobalSecurityAdvisory(ctx.input.ghsaId);
    return {
      output: { advisory },
      message: `Retrieved global security advisory **${advisory.ghsa_id ?? ctx.input.ghsaId}**.`
    };
  })
  .build();
