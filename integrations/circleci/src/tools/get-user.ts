import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve information about the currently authenticated CircleCI user, including their organizations and collaborations. Optionally look up a different user by their UUID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'UUID of a specific user to look up. If omitted, returns the current authenticated user.'
        ),
      includeCollaborations: z
        .boolean()
        .optional()
        .describe(
          'Include the list of organizations/collaborations the user belongs to (only for current user)'
        )
    })
  )
  .output(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      login: z.string().optional(),
      collaborations: z
        .array(
          z.object({
            organizationId: z.string(),
            organizationName: z.string().optional(),
            vcsType: z.string().optional(),
            avatarUrl: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user: any;
    if (ctx.input.userId) {
      user = await client.getUserById(ctx.input.userId);
    } else {
      user = await client.getCurrentUser();
    }

    let collaborations:
      | {
          organizationId: string;
          organizationName?: string;
          vcsType?: string;
          avatarUrl?: string;
        }[]
      | undefined;

    if (ctx.input.includeCollaborations && !ctx.input.userId) {
      let collabs = await client.getUserCollaborations();
      collaborations = (collabs || []).map((c: any) => ({
        organizationId: c.id,
        organizationName: c.name,
        vcsType: c.vcs_type,
        avatarUrl: c.avatar_url
      }));
    }

    return {
      output: {
        userId: user.id,
        name: user.name,
        login: user.login,
        collaborations
      },
      message: `User **${user.name || user.login || user.id}**.`
    };
  })
  .build();
