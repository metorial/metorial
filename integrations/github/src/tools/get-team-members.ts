import { anyOf, buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getTeamMembers = SlateTool.create(spec, {
  name: 'Get Team Members',
  key: 'get_team_members',
  description:
    'Get the members of a specific GitHub organization team. Results are limited to teams accessible with the current credentials.',
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('read:org', 'write:org', 'admin:org'))
  .input(
    z.object({
      org: z.string().describe('Organization login that contains the team'),
      team_slug: z.string().describe('Team slug')
    })
  )
  .output(
    z.object({
      organization: z.string().describe('Organization login'),
      teamNodeId: z.string().describe('Team GraphQL node ID'),
      teamId: z.number().nullable().describe('Team database ID'),
      teamSlug: z.string().describe('Team slug'),
      teamName: z.string().describe('Team name'),
      htmlUrl: z.string().describe('Team URL'),
      members: z.array(
        z.object({
          userNodeId: z.string().describe('User GraphQL node ID'),
          userId: z.number().nullable().describe('User database ID'),
          login: z.string().describe('GitHub username'),
          htmlUrl: z.string().describe('User profile URL'),
          avatarUrl: z.string().describe('User avatar URL')
        })
      ),
      totalCount: z.number().describe('Total team members reported by GitHub'),
      returnedCount: z.number().describe('Members returned in this response'),
      hasMore: z
        .boolean()
        .describe('Whether GitHub reports additional members beyond this response'),
      endCursor: z.string().nullable().describe('GitHub cursor after the last returned member')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    try {
      let team = await client.getTeamMembers(ctx.input.org, ctx.input.team_slug);
      if (!team) {
        throw createApiServiceError(
          `GitHub team "${ctx.input.org}/${ctx.input.team_slug}" was not found or is not visible to the current credentials.`,
          { reason: 'github_team_not_found' }
        );
      }

      let members = team.members.nodes.map(member => ({
        userNodeId: member.id,
        userId: member.databaseId,
        login: member.login,
        htmlUrl: member.url,
        avatarUrl: member.avatarUrl
      }));

      return {
        output: {
          organization: ctx.input.org,
          teamNodeId: team.id,
          teamId: team.databaseId,
          teamSlug: team.slug,
          teamName: team.name,
          htmlUrl: team.url,
          members,
          totalCount: team.members.totalCount,
          returnedCount: members.length,
          hasMore: team.members.pageInfo.hasNextPage,
          endCursor: team.members.pageInfo.endCursor
        },
        message: `Found **${members.length}** members in **${ctx.input.org}/${team.slug}**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation: 'get team members',
        reason: 'github_get_team_members_failed',
        nestedKeys: ['errors']
      });
    }
  })
  .build();
