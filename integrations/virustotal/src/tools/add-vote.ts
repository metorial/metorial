import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { safeJson } from '../lib/contracts';
import { spec } from '../spec';

let resourceTypeMap: Record<string, string> = {
  file: 'files',
  url: 'urls',
  domain: 'domains',
  ip: 'ip_addresses'
};

export let addVote = SlateTool.create(spec, {
  name: 'Add Vote',
  key: 'add_vote',
  description: `Cast a vote on a VirusTotal resource (file, URL, domain, or IP address) to contribute to community reputation. Vote either "malicious" or "harmless".`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['file', 'url', 'domain', 'ip'])
        .describe('Type of resource to vote on'),
      resourceId: z
        .string()
        .describe('Resource identifier (file hash, URL id, domain, or IP address)'),
      verdict: z.enum(['malicious', 'harmless']).describe('Your verdict for the resource')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the native vote receipt was confirmed'),
      voteId: z.string().optional().describe('Native vote ID'),
      verdict: z.enum(['malicious', 'harmless']).optional().describe('Native recorded verdict')
    })
  )
  .handleInvocation(async ctx => {
    safeJson(ctx.input, [ctx.auth.token]);
    let client = new Client(ctx.auth);
    let apiType = resourceTypeMap[ctx.input.resourceType] ?? ctx.input.resourceType;
    const vote = await client.addVote(apiType, ctx.input.resourceId, ctx.input.verdict);

    return {
      output: {
        success: true,
        voteId: vote.id,
        verdict: vote.attributes?.verdict
      },
      message: `Voted **${ctx.input.verdict}** on ${ctx.input.resourceType} \`${ctx.input.resourceId}\`.`
    };
  })
  .build();
