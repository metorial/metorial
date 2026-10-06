import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
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
      organization: organizationInput
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
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.listPolicyPacks(org);

    let policyPacks = result.policyPacks.map(p => ({
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
