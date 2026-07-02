import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let orgOutputSchema = z.object({
  organizationId: z.string().describe('The organization ID'),
  name: z.string().describe('The organization name'),
  domainNames: z.array(z.string()).describe('Associated domain names'),
  tags: z.array(z.string()).describe('Tags on the organization'),
  externalId: z.string().nullable().describe('External system ID'),
  sharedTickets: z.boolean().describe('Whether shared tickets are enabled'),
  createdAt: z.string().describe('When the organization was created'),
  updatedAt: z.string().describe('When the organization was last updated')
});

let mapOrg = (o: any) => ({
  organizationId: String(o.id),
  name: o.name,
  domainNames: o.domain_names || [],
  tags: o.tags || [],
  externalId: o.external_id || null,
  sharedTickets: o.shared_tickets || false,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Lists organizations in Zendesk. Organizations can group end users and are useful for managing shared tickets and reporting.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(25).describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      organizations: z.array(orgOutputSchema),
      count: z.number(),
      nextPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listOrganizations({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let organizations = (data.organizations || []).map(mapOrg);

    return {
      output: {
        organizations,
        count: data.count || organizations.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || organizations.length} organization(s), showing ${organizations.length} on this page.`
    };
  })
  .build();

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieves a single Zendesk organization by its ID, including domain names, tags, and settings.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      organizationId: z.string().describe('The organization ID to retrieve')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let org = await client.getOrganization(ctx.input.organizationId);

    return {
      output: mapOrg(org),
      message: `Organization **${org.name}** (ID: ${org.id})`
    };
  })
  .build();

export let createOrganization = SlateTool.create(spec, {
  name: 'Create Organization',
  key: 'create_organization',
  description: `Creates a new organization in Zendesk. Organizations group end users for shared ticket management and reporting.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the organization'),
      domainNames: z
        .array(z.string())
        .optional()
        .describe('Domain names associated with the organization (e.g., ["acme.com"])'),
      tags: z.array(z.string()).optional().describe('Tags to add'),
      sharedTickets: z.boolean().optional().describe('Enable shared tickets'),
      sharedComments: z.boolean().optional().describe('Enable shared comments'),
      externalId: z.string().optional().describe('External system ID'),
      notes: z.string().optional().describe('Notes about the organization'),
      details: z.string().optional().describe('Details about the organization')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let orgData: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.domainNames) orgData.domain_names = ctx.input.domainNames;
    if (ctx.input.tags) orgData.tags = ctx.input.tags;
    if (ctx.input.sharedTickets !== undefined)
      orgData.shared_tickets = ctx.input.sharedTickets;
    if (ctx.input.sharedComments !== undefined)
      orgData.shared_comments = ctx.input.sharedComments;
    if (ctx.input.externalId) orgData.external_id = ctx.input.externalId;
    if (ctx.input.notes) orgData.notes = ctx.input.notes;
    if (ctx.input.details) orgData.details = ctx.input.details;

    let org = await client.createOrganization(orgData);

    return {
      output: mapOrg(org),
      message: `Created organization **${org.name}** (ID: ${org.id})`
    };
  })
  .build();

export let updateOrganization = SlateTool.create(spec, {
  name: 'Update Organization',
  key: 'update_organization',
  description: `Updates an existing Zendesk organization. Can modify name, domain names, tags, and settings.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      organizationId: z.string().describe('The organization ID to update'),
      name: z.string().optional().describe('New name'),
      domainNames: z.array(z.string()).optional().describe('New domain names'),
      tags: z.array(z.string()).optional().describe('Replace all tags'),
      sharedTickets: z.boolean().optional().describe('Enable/disable shared tickets'),
      sharedComments: z.boolean().optional().describe('Enable/disable shared comments'),
      externalId: z.string().optional().describe('External system ID'),
      notes: z.string().optional().describe('Notes'),
      details: z.string().optional().describe('Details')
    })
  )
  .output(orgOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let orgData: Record<string, any> = {};
    if (ctx.input.name !== undefined) orgData.name = ctx.input.name;
    if (ctx.input.domainNames !== undefined) orgData.domain_names = ctx.input.domainNames;
    if (ctx.input.tags !== undefined) orgData.tags = ctx.input.tags;
    if (ctx.input.sharedTickets !== undefined)
      orgData.shared_tickets = ctx.input.sharedTickets;
    if (ctx.input.sharedComments !== undefined)
      orgData.shared_comments = ctx.input.sharedComments;
    if (ctx.input.externalId !== undefined) orgData.external_id = ctx.input.externalId;
    if (ctx.input.notes !== undefined) orgData.notes = ctx.input.notes;
    if (ctx.input.details !== undefined) orgData.details = ctx.input.details;

    let org = await client.updateOrganization(ctx.input.organizationId, orgData);

    return {
      output: mapOrg(org),
      message: `Updated organization **${org.name}** (ID: ${org.id})`
    };
  })
  .build();

export let deleteOrganization = SlateTool.create(spec, {
  name: 'Delete Organization',
  key: 'delete_organization',
  description: `Permanently deletes an organization from Zendesk. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      organizationId: z.string().describe('The organization ID to delete')
    })
  )
  .output(
    z.object({
      organizationId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    await client.deleteOrganization(ctx.input.organizationId);

    return {
      output: {
        organizationId: ctx.input.organizationId,
        deleted: true
      },
      message: `Deleted organization **#${ctx.input.organizationId}**`
    };
  })
  .build();
