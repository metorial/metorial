import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

let rewriteSchema = z.object({
  rewriteId: z.string().describe('Unique ID of the rewrite rule'),
  name: z.string().describe('Domain name to rewrite'),
  content: z.string().describe('Target IP address or CNAME')
});

export let manageRewrites = SlateTool.create(spec, {
  name: 'Manage DNS Rewrites',
  key: 'manage_rewrites',
  description: `Manage DNS rewrite rules for a NextDNS profile. Add or remove custom DNS rewrite rules that map domain names to specific IP addresses or CNAMEs. Useful for local network resolution (e.g., mapping "router.local" to "192.168.1.1").`,
  instructions: [
    'To list current rewrites, omit the add/remove fields.',
    'Rewrites cannot be updated in-place; remove and re-add to modify.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile'),
      rewritesToAdd: z
        .array(
          z.object({
            name: z.string().describe('Domain name to rewrite (e.g., "router.local")'),
            content: z.string().describe('Target IP address or CNAME (e.g., "192.168.1.1")')
          })
        )
        .optional()
        .describe('Rewrite rules to add'),
      rewriteIdsToRemove: z
        .array(z.string())
        .optional()
        .describe('IDs of rewrite rules to remove')
    })
  )
  .output(
    z.object({
      rewrites: z.array(rewriteSchema).describe('Current DNS rewrite rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let { profileId } = ctx.input;

    if (ctx.input.rewritesToAdd) {
      for (let rewrite of ctx.input.rewritesToAdd) {
        await client.addRewrite(profileId, rewrite.name, rewrite.content);
      }
    }

    if (ctx.input.rewriteIdsToRemove) {
      for (let id of ctx.input.rewriteIdsToRemove) {
        await client.removeRewrite(profileId, id);
      }
    }

    let result = await client.getRewrites(profileId);
    let rewrites = (result.data || []).map((r: any) => ({
      rewriteId: r.id,
      name: r.name,
      content: r.content
    }));

    return {
      output: { rewrites },
      message: `Profile has **${rewrites.length}** rewrite rule(s).`
    };
  })
  .build();
