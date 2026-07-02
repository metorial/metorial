import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrganization = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `Admin tool for managing a Zoho Mail organization. Retrieve organization details, storage/subscription info, list users, list domains, and list groups. Requires admin-level OAuth scopes.`,
  instructions: ['Requires the organization ID (zoid). Use Get Account Info first if needed.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID (zoid)'),
      action: z
        .enum(['getDetails', 'getStorage', 'listUsers', 'listDomains', 'listGroups'])
        .describe('Operation to perform'),
      start: z.number().optional().describe('Pagination start (for listUsers)'),
      limit: z.number().optional().describe('Pagination limit (for listUsers)')
    })
  )
  .output(
    z.object({
      organization: z.any().optional().describe('Organization details'),
      storage: z.any().optional().describe('Storage/subscription info'),
      users: z.array(z.any()).optional().describe('Organization users'),
      domains: z.array(z.any()).optional().describe('Organization domains'),
      groups: z.array(z.any()).optional().describe('Organization groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, organizationId } = ctx.input;

    if (action === 'getDetails') {
      let org = await client.getOrganizationDetails(organizationId);
      return {
        output: { organization: org },
        message: `Retrieved organization details for ${organizationId}.`
      };
    }

    if (action === 'getStorage') {
      let storage = await client.getOrganizationStorage(organizationId);
      return {
        output: { storage },
        message: `Retrieved storage details for organization ${organizationId}.`
      };
    }

    if (action === 'listUsers') {
      let users = await client.listOrganizationUsers(organizationId, {
        start: ctx.input.start,
        limit: ctx.input.limit
      });
      return {
        output: { users },
        message: `Retrieved **${users.length}** user(s) in the organization.`
      };
    }

    if (action === 'listDomains') {
      let domains = await client.listOrganizationDomains(organizationId);
      return {
        output: { domains },
        message: `Retrieved **${domains.length}** domain(s) in the organization.`
      };
    }

    if (action === 'listGroups') {
      let groups = await client.listOrganizationGroups(organizationId);
      return {
        output: { groups },
        message: `Retrieved **${groups.length}** group(s) in the organization.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
