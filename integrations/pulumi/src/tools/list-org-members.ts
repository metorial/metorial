import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrgMembers = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_org_members',
  description: `List all members of a Pulumi organization with their roles and profile information.`,
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
      members: z.array(
        z.object({
          userName: z.string().optional(),
          userLogin: z.string().optional(),
          email: z.string().optional(),
          avatarUrl: z.string().optional(),
          role: z.string().optional(),
          knownToPulumi: z.boolean().optional()
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

    let result = await client.listOrgMembers(org);

    let members = (result.members || []).map((m: any) => ({
      userName: m.user?.name,
      userLogin: m.user?.githubLogin,
      email: m.user?.email,
      avatarUrl: m.user?.avatarUrl,
      role: m.role,
      knownToPulumi: m.knownToPulumi
    }));

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in organization **${org}**`
    };
  })
  .build();
