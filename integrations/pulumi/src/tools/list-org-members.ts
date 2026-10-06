import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
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
      organization: organizationInput,
      continuationToken: z
        .string()
        .optional()
        .describe('Request one page from this token; omit to retrieve all pages.')
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
      ),
      continuationToken: z.string().optional(),
      returnedCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.listOrgMembers(org, ctx.input.continuationToken);

    let members = result.members.map(m => ({
      userName: m.user?.name,
      userLogin: m.user?.githubLogin,
      email: m.user?.email ?? undefined,
      avatarUrl: m.user?.avatarUrl,
      role: m.role,
      knownToPulumi: m.knownToPulumi
    }));

    return {
      output: {
        members,
        continuationToken: result.continuationToken,
        returnedCount: members.length
      },
      message: `Found **${members.length}** member(s) in organization **${org}**`
    };
  })
  .build();
