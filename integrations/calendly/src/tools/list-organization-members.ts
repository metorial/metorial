import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizationMembers = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_organization_members',
  description: `List all members of a Calendly organization. Returns member profiles with their roles. Optionally filter by email address. Requires admin/owner role for organization-level access.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationUri: z.string().describe('URI of the organization to list members for'),
      email: z.string().optional().describe('Filter members by email address'),
      count: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          membershipUri: z.string().describe('Unique URI of the membership'),
          role: z.string().describe('Member role (user, admin, or owner)'),
          userUri: z.string().describe('URI of the user'),
          name: z.string().describe('Member name'),
          email: z.string().describe('Member email'),
          slug: z.string().describe('URL-friendly identifier'),
          schedulingUrl: z.string().describe('Member scheduling page URL'),
          timezone: z.string().describe('Member timezone'),
          avatarUrl: z.string().nullable().describe('URL of the member avatar image'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOrganizationMemberships({
      organizationUri: ctx.input.organizationUri,
      email: ctx.input.email,
      count: ctx.input.count,
      pageToken: ctx.input.pageToken
    });

    let members = result.collection.map(m => ({
      membershipUri: m.uri,
      role: m.role,
      userUri: m.user.uri,
      name: m.user.name,
      email: m.user.email,
      slug: m.user.slug,
      schedulingUrl: m.user.schedulingUrl,
      timezone: m.user.timezone,
      avatarUrl: m.user.avatarUrl,
      createdAt: m.user.createdAt,
      updatedAt: m.user.updatedAt
    }));

    return {
      output: {
        members,
        nextPageToken: result.pagination.nextPageToken
      },
      message: `Found **${members.length}** organization members.${result.pagination.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
