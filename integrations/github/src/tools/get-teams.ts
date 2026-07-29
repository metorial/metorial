import { anyOf, buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getTeams = SlateTool.create(spec, {
  name: 'Get Teams',
  key: 'get_teams',
  description:
    'Get details of the GitHub organization teams a user belongs to. Results are limited to organizations and teams accessible with the current credentials.',
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('read:org', 'write:org', 'admin:org'))
  .input(
    z.object({
      user: z
        .string()
        .optional()
        .describe('Username to get teams for. If omitted, uses the authenticated GitHub user.')
    })
  )
  .output(
    z.object({
      user: z.string().describe('GitHub username whose team memberships were queried'),
      organizations: z.array(
        z.object({
          organizationNodeId: z.string().describe('Organization GraphQL node ID'),
          organizationId: z.number().nullable().describe('Organization database ID'),
          login: z.string().describe('Organization login'),
          htmlUrl: z.string().describe('Organization URL'),
          teams: z.array(
            z.object({
              teamNodeId: z.string().describe('Team GraphQL node ID'),
              teamId: z.number().nullable().describe('Team database ID'),
              name: z.string().describe('Team name'),
              slug: z.string().describe('Team slug'),
              description: z.string().nullable().describe('Team description'),
              htmlUrl: z.string().describe('Team URL')
            })
          ),
          totalTeamCount: z
            .number()
            .describe('Total matching teams reported for this organization'),
          returnedTeamCount: z.number().describe('Teams returned in this response'),
          hasMoreTeams: z
            .boolean()
            .describe('Whether GitHub reports additional matching teams beyond this response'),
          endCursor: z
            .string()
            .nullable()
            .describe('GitHub cursor after the last returned team')
        })
      ),
      totalOrganizationCount: z
        .number()
        .describe('Total accessible organizations reported for this user'),
      returnedOrganizationCount: z
        .number()
        .describe('Organizations returned in this response'),
      hasMoreOrganizations: z
        .boolean()
        .describe(
          'Whether GitHub reports additional accessible organizations beyond this response'
        ),
      endCursor: z
        .string()
        .nullable()
        .describe('GitHub cursor after the last returned organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    try {
      let result = await client.getTeams(ctx.input.user);
      let organizations = result.organizations.nodes.map(organization => ({
        organizationNodeId: organization.id,
        organizationId: organization.databaseId,
        login: organization.login,
        htmlUrl: organization.url,
        teams: organization.teams.nodes.map(team => ({
          teamNodeId: team.id,
          teamId: team.databaseId,
          name: team.name,
          slug: team.slug,
          description: team.description,
          htmlUrl: team.url
        })),
        totalTeamCount: organization.teams.totalCount,
        returnedTeamCount: organization.teams.nodes.length,
        hasMoreTeams: organization.teams.pageInfo.hasNextPage,
        endCursor: organization.teams.pageInfo.endCursor
      }));

      return {
        output: {
          user: result.user,
          organizations,
          totalOrganizationCount: result.organizations.totalCount,
          returnedOrganizationCount: organizations.length,
          hasMoreOrganizations: result.organizations.pageInfo.hasNextPage,
          endCursor: result.organizations.pageInfo.endCursor
        },
        message: `Found **${organizations.reduce((count, organization) => count + organization.teams.length, 0)}** teams for **${result.user}** across **${organizations.length}** organizations.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GitHub',
        operation: 'get teams',
        reason: 'github_get_teams_failed',
        nestedKeys: ['errors']
      });
    }
  })
  .build();
