import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, createClient } from '../lib/client';
import { organizationInput, paginationInput, paginationOutput } from '../lib/schemas';
import { spec } from '../spec';

export const whoAmI = SlateTool.create(spec, {
  key: 'who_am_i',
  name: 'Current User',
  description:
    'Identify the Buildkite user who owns the current API access token. Requires read_user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string(),
      avatarUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client({ token: ctx.auth.token }).getCurrentUser();
    return {
      output: {
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url
      },
      message: `Connected as **${user.name}**.`
    };
  });
export const listOrganizations = SlateTool.create(spec, {
  key: 'list_organizations',
  name: 'List Organizations',
  description:
    'Discover accessible Buildkite organizations and their slugs for subsequent tools. Requires read_organizations; organizations without an active plan are omitted.',
  tags: { readOnly: true }
})
  .input(z.object(paginationInput))
  .output(
    z.object({
      ...paginationOutput,
      organizations: z.array(
        z.object({
          organizationId: z.string(),
          organizationSlug: z.string(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const organizations = await client.listOrganizations(ctx.input);
    return {
      output: {
        organizations: organizations.map(org => ({
          organizationId: org.id,
          organizationSlug: org.slug,
          name: org.name
        })),
        ...client.pagination
      },
      message: `Found ${organizations.length} organization(s).`
    };
  });
export const listClusters = SlateTool.create(spec, {
  key: 'list_clusters',
  name: 'List Clusters',
  description:
    'Discover Buildkite clusters and their UUIDs for create_pipeline. Choose the organization with list_organizations. Requires read_clusters.',
  tags: { readOnly: true }
})
  .input(z.object({ ...organizationInput, ...paginationInput }))
  .output(
    z.object({
      ...paginationOutput,
      clusters: z.array(
        z.object({
          clusterId: z.string(),
          name: z.string(),
          description: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const clusters = await client.listClusters(ctx.input);
    return {
      output: {
        clusters: clusters.map(row => ({
          clusterId: row.id,
          name: row.name,
          description: row.description ?? null
        })),
        ...client.pagination
      },
      message: `Found ${clusters.length} cluster(s).`
    };
  });
export const listTeams = SlateTool.create(spec, {
  key: 'list_teams',
  name: 'List Teams',
  description:
    'Discover Buildkite team UUIDs and names for pipeline access assignments. Choose the organization with list_organizations. Requires read_teams.',
  tags: { readOnly: true }
})
  .input(z.object({ ...organizationInput, ...paginationInput }))
  .output(
    z.object({
      ...paginationOutput,
      teams: z.array(
        z.object({
          teamId: z.string(),
          name: z.string(),
          teamSlug: z.string(),
          description: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const teams = await client.listTeams(ctx.input);
    return {
      output: {
        teams: teams.map(row => ({
          teamId: row.id,
          name: row.name,
          teamSlug: row.slug,
          description: row.description ?? null
        })),
        ...client.pagination
      },
      message: `Found ${teams.length} team(s).`
    };
  });
