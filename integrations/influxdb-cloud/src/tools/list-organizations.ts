import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, requiredOrg, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

export let organizationSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  orgId: z.string().describe('Unique organization ID'),
  name: z.string().describe('Organization name'),
  description: z.string().optional().describe('Organization description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let memberSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  userId: z.string().describe('User ID'),
  name: z.string().optional().describe('User name'),
  status: z.string().optional().describe('Member status'),
  role: z.string().optional().describe('Member role')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List organizations visible to the current API token. Cloud returns only the organization that owns the token. An organization is a workspace for a group of users, and all resources belong to an organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of organizations to return'),
      offset: z.number().optional().describe('Number of organizations to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      organizations: z.array(organizationSchema).describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listOrganizations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let organizations = requireArray(result, 'orgs').map((o: any) => ({
      raw: o,
      orgId: resource(o, ['id', 'name']).id,
      name: o.name,
      description: optionalString(o.description),
      createdAt: optionalString(o.createdAt),
      updatedAt: optionalString(o.updatedAt)
    }));

    return {
      output: { organizations, raw: result },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();

export let getOrganizationMembers = SlateTool.create(spec, {
  name: 'Get Organization Members',
  key: 'get_organization_members',
  description: `List all members of a specific organization, including their roles and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      members: z.array(memberSchema).describe('List of organization members')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let targetOrgId = requiredOrg(ctx.input.orgId || ctx.config.orgId);
    let result = await client.getOrganizationMembers(targetOrgId);

    let members = requireArray(result, 'users').map((m: any) => ({
      raw: m,
      userId: resource(m, ['id']).id,
      name: optionalString(m.name),
      status: optionalString(m.status),
      role: optionalString(m.role)
    }));

    return {
      output: { members, raw: result },
      message: `Found **${members.length}** member(s) in organization.`
    };
  })
  .build();
