import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let domainReputationLookup = SlateTool.create(spec, {
  name: 'Domain Reputation Lookup',
  key: 'domain_reputation_lookup',
  description:
    'Assess a domain for security risk using its reputation verdict, trust score, domain-generation analysis, threat intelligence matches, and supporting signals.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      domainName: z
        .string()
        .trim()
        .min(1)
        .max(253)
        .describe('Domain name to assess, such as example.com')
    })
  )
  .output(
    z.object({
      reputation: z
        .any()
        .describe('Domain reputation verdict and supporting threat intelligence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let reputation = await client.domainReputation(ctx.input.domainName);
    return {
      output: { reputation },
      message: `Retrieved domain reputation for **${ctx.input.domainName}**.`
    };
  })
  .build();
