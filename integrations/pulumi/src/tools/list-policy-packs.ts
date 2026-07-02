import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPolicyPacks = SlateTool.create(spec, {
  name: 'List Policy Packs',
  key: 'list_policy_packs',
  description: `List all policy packs in a Pulumi organization. Policy packs contain compliance and governance rules that are enforced during stack updates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)')
    })
  )
  .output(
    z.object({
      policyPacks: z.array(
        z.object({
          name: z.string().optional(),
          displayName: z.string().optional(),
          versions: z.array(z.number()).optional(),
          versionTags: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result = await client.listPolicyPacks(org);

    let policyPacks = (result.policyPacks || []).map((p: any) => ({
      name: p.name,
      displayName: p.displayName,
      versions: p.versions,
      versionTags: p.versionTags
    }));

    return {
      output: { policyPacks },
      message: `Found **${policyPacks.length}** policy pack(s) in organization **${org}**`
    };
  })
  .build();
