import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountTool = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve account information and optionally list hiring team members. Use this to verify account details, check team configuration, or look up member IDs for other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeMembers: z.boolean().optional().describe('Also fetch hiring team members')
    })
  )
  .output(
    z.object({
      accountName: z.string().optional().describe('Account name'),
      subdomain: z.string().optional().describe('Account subdomain'),
      description: z.string().optional().describe('Account description'),
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            name: z.string().describe('Member name'),
            email: z.string().optional().describe('Member email'),
            headline: z.string().optional().describe('Member headline/role'),
            role: z.string().optional().describe('Member role in Workable')
          })
        )
        .optional()
        .describe('Hiring team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let account = await client.getAccount();

    let output: any = {
      accountName: account.name,
      subdomain: account.subdomain,
      description: account.description
    };

    if (ctx.input.includeMembers) {
      let membersResult = await client.getMembers();
      output.members = (membersResult.members || []).map((m: any) => ({
        memberId: m.id,
        name: m.name,
        email: m.email,
        headline: m.headline,
        role: m.role
      }));
    }

    return {
      output,
      message: `Account: **${output.accountName || output.subdomain}**${output.members ? ` with ${output.members.length} member(s)` : ''}.`
    };
  })
  .build();
