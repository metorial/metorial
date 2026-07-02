import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let orgOutputSchema = z.object({
  organizationId: z.number().describe('Organization ID'),
  name: z.string().describe('Organization username'),
  fullName: z.string().describe('Organization display name'),
  description: z.string().describe('Organization description'),
  avatarUrl: z.string().describe('Avatar URL'),
  website: z.string().describe('Website URL'),
  location: z.string().describe('Location'),
  visibility: z.string().describe('Visibility (public, limited, private)')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List organizations that the authenticated user belongs to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      organizations: z.array(orgOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let orgs = await client.listMyOrgs({ page: ctx.input.page, limit: ctx.input.limit });

    return {
      output: {
        organizations: orgs.map(o => ({
          organizationId: o.id,
          name: o.name,
          fullName: o.full_name || '',
          description: o.description || '',
          avatarUrl: o.avatar_url || '',
          website: o.website || '',
          location: o.location || '',
          visibility: o.visibility || 'public'
        }))
      },
      message: `Found **${orgs.length}** organizations`
    };
  })
  .build();

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve detailed information about an organization including its teams and repositories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Organization username')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let o = await client.getOrg(ctx.input.orgName);

    return {
      output: {
        organizationId: o.id,
        name: o.name,
        fullName: o.full_name || '',
        description: o.description || '',
        avatarUrl: o.avatar_url || '',
        website: o.website || '',
        location: o.location || '',
        visibility: o.visibility || 'public'
      },
      message: `Retrieved organization **${o.name}**`
    };
  })
  .build();

export let createOrganization = SlateTool.create(spec, {
  name: 'Create Organization',
  key: 'create_organization',
  description: `Create a new organization on the Gitea instance.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Organization username (unique identifier)'),
      fullName: z.string().optional().describe('Display name'),
      description: z.string().optional().describe('Organization description'),
      website: z.string().optional().describe('Website URL'),
      location: z.string().optional().describe('Location'),
      visibility: z
        .enum(['public', 'limited', 'private'])
        .optional()
        .describe('Visibility level')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let o = await client.createOrg({
      username: ctx.input.username,
      fullName: ctx.input.fullName,
      description: ctx.input.description,
      website: ctx.input.website,
      location: ctx.input.location,
      visibility: ctx.input.visibility
    });

    return {
      output: {
        organizationId: o.id,
        name: o.name,
        fullName: o.full_name || '',
        description: o.description || '',
        avatarUrl: o.avatar_url || '',
        website: o.website || '',
        location: o.location || '',
        visibility: o.visibility || 'public'
      },
      message: `Created organization **${o.name}**`
    };
  })
  .build();

export let updateOrganization = SlateTool.create(spec, {
  name: 'Update Organization',
  key: 'update_organization',
  description: `Update an organization's display name, description, website, location, or visibility.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Organization username'),
      fullName: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      website: z.string().optional().describe('New website URL'),
      location: z.string().optional().describe('New location'),
      visibility: z
        .enum(['public', 'limited', 'private'])
        .optional()
        .describe('New visibility level')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let o = await client.updateOrg(ctx.input.orgName, {
      fullName: ctx.input.fullName,
      description: ctx.input.description,
      website: ctx.input.website,
      location: ctx.input.location,
      visibility: ctx.input.visibility
    });

    return {
      output: {
        organizationId: o.id,
        name: o.name,
        fullName: o.full_name || '',
        description: o.description || '',
        avatarUrl: o.avatar_url || '',
        website: o.website || '',
        location: o.location || '',
        visibility: o.visibility || 'public'
      },
      message: `Updated organization **${o.name}**`
    };
  })
  .build();
