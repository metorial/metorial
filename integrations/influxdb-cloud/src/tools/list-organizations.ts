import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let organizationSchema = z.object({
  orgId: z.string().describe('Unique organization ID'),
  name: z.string().describe('Organization name'),
  description: z.string().optional().describe('Organization description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let memberSchema = z.object({
  userId: z.string().describe('User ID'),
  name: z.string().optional().describe('User name'),
  status: z.string().optional().describe('Member status'),
  role: z.string().optional().describe('Member role')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all organizations accessible to the current API token. An organization is a workspace for a group of users, and all resources belong to an organization.`,
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
      organizations: z.array(organizationSchema).describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listOrganizations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let organizations = (result.orgs || []).map((o: any) => ({
      orgId: o.id,
      name: o.name,
      description: o.description,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }));

    return {
      output: { organizations },
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
      orgId: z
        .string()
        .optional()
        .describe('Organization ID (defaults to the configured organization)')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of organization members')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let targetOrgId = ctx.input.orgId || ctx.config.orgId;
    let result = await client.getOrganizationMembers(targetOrgId);

    let members = (result.users || []).map((m: any) => ({
      userId: m.id,
      name: m.name,
      status: m.status,
      role: m.role
    }));

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in organization.`
    };
  })
  .build();
