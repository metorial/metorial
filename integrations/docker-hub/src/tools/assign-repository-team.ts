import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assignRepositoryTeam = SlateTool.create(spec, {
  name: 'Assign Repository Team',
  key: 'assign_repository_team',
  description: `Grant a Docker Hub organization team access to a repository with read, write, or admin permission. Use List Teams first to find the team ID.`,
  instructions: [
    'The repository must belong to an organization namespace.',
    'The groupId field is the numeric team ID returned by List Teams.'
  ]
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub organization namespace that owns the repository. Falls back to configured default namespace.'
        ),
      repositoryName: z.string().describe('Name of the repository to grant access to.'),
      groupId: z.number().describe('Numeric Docker Hub team/group ID.'),
      permission: z
        .enum(['read', 'write', 'admin'])
        .describe(
          'Permission to grant: read can pull, write can pull and push, admin can manage repository settings.'
        )
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Numeric Docker Hub team/group ID.'),
      groupName: z.string().describe('Name of the team/group.'),
      permission: z.string().describe('Permission granted to the team.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    let result = await client.assignRepositoryTeam(ns, ctx.input.repositoryName, {
      groupId: ctx.input.groupId,
      permission: ctx.input.permission
    });

    return {
      output: {
        groupId: result.group_id,
        groupName: result.group_name,
        permission: result.permission
      },
      message: `Granted **${result.permission}** access to team **${result.group_name}** for **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
