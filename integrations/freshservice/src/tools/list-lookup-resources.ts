import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let createClient = (ctx: { auth: any; config: any }) =>
  new Client({
    token: ctx.auth.token,
    subdomain: ctx.config.subdomain,
    authType: ctx.auth.authType
  });

let mapAgentGroup = (group: Record<string, any>) => ({
  groupId: group.id,
  name: group.name,
  description: group.description ?? null,
  agentIds: group.agent_ids ?? null,
  observerIds: group.observer_ids ?? null,
  restricted: group.restricted ?? null,
  createdAt: group.created_at ?? null,
  updatedAt: group.updated_at ?? null
});

let mapLocation = (location: Record<string, any>) => ({
  locationId: location.id,
  name: location.name,
  parentLocationId: location.parent_location_id ?? null,
  primaryContactId: location.primary_contact_id ?? null,
  address: location.address ?? null,
  createdAt: location.created_at ?? null,
  updatedAt: location.updated_at ?? null
});

let mapVendor = (vendor: Record<string, any>) => ({
  vendorId: vendor.id,
  name: vendor.name,
  description: vendor.description ?? null,
  primaryContactId: vendor.primary_contact_id ?? null,
  createdAt: vendor.created_at ?? null,
  updatedAt: vendor.updated_at ?? null
});

const paginationInput = {
  page: z.number().optional().describe('Page number'),
  perPage: z.number().optional().describe('Results per page')
};

export let listAgentGroups = SlateTool.create(spec, {
  name: 'List Agent Groups',
  key: 'list_agent_groups',
  description: 'List Freshservice agent groups for assignment and routing.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object(paginationInput))
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Agent group ID'),
            name: z.string().describe('Group name'),
            description: z.string().nullable().describe('Group description'),
            agentIds: z.array(z.number()).nullable().describe('Agent IDs in the group'),
            observerIds: z.array(z.number()).nullable().describe('Observer IDs'),
            restricted: z.boolean().nullable().describe('Whether the group is restricted'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Agent groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listAgentGroups({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let groups = result.groups.map(mapAgentGroup);

    return {
      output: { groups },
      message: `Found **${groups.length}** agent groups`
    };
  })
  .build();

export let getAgentGroup = SlateTool.create(spec, {
  name: 'Get Agent Group',
  key: 'get_agent_group',
  description: 'Retrieve a Freshservice agent group by ID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('Agent group ID')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Agent group ID'),
      name: z.string().describe('Group name'),
      description: z.string().nullable().describe('Group description'),
      agentIds: z.array(z.number()).nullable().describe('Agent IDs in the group'),
      observerIds: z.array(z.number()).nullable().describe('Observer IDs'),
      restricted: z.boolean().nullable().describe('Whether the group is restricted'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let group = await client.getAgentGroup(ctx.input.groupId);

    return {
      output: mapAgentGroup(group),
      message: `Retrieved agent group **#${group.id}**: "${group.name}"`
    };
  })
  .build();

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: 'List Freshservice locations for requester, department, and asset assignment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object(paginationInput))
  .output(
    z.object({
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Location ID'),
            name: z.string().describe('Location name'),
            parentLocationId: z.number().nullable().describe('Parent location ID'),
            primaryContactId: z.number().nullable().describe('Primary contact ID'),
            address: z.unknown().nullable().describe('Location address object'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listLocations({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let locations = result.locations.map(mapLocation);

    return {
      output: { locations },
      message: `Found **${locations.length}** locations`
    };
  })
  .build();

export let getLocation = SlateTool.create(spec, {
  name: 'Get Location',
  key: 'get_location',
  description: 'Retrieve a Freshservice location by ID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.number().describe('Location ID')
    })
  )
  .output(
    z.object({
      locationId: z.number().describe('Location ID'),
      name: z.string().describe('Location name'),
      parentLocationId: z.number().nullable().describe('Parent location ID'),
      primaryContactId: z.number().nullable().describe('Primary contact ID'),
      address: z.unknown().nullable().describe('Location address object'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let location = await client.getLocation(ctx.input.locationId);

    return {
      output: mapLocation(location),
      message: `Retrieved location **#${location.id}**: "${location.name}"`
    };
  })
  .build();

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: 'List Freshservice vendors for asset and procurement workflows.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object(paginationInput))
  .output(
    z.object({
      vendors: z
        .array(
          z.object({
            vendorId: z.number().describe('Vendor ID'),
            name: z.string().describe('Vendor name'),
            description: z.string().nullable().describe('Vendor description'),
            primaryContactId: z.number().nullable().describe('Primary contact ID'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Vendors')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listVendors({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let vendors = result.vendors.map(mapVendor);

    return {
      output: { vendors },
      message: `Found **${vendors.length}** vendors`
    };
  })
  .build();

export let getVendor = SlateTool.create(spec, {
  name: 'Get Vendor',
  key: 'get_vendor',
  description: 'Retrieve a Freshservice vendor by ID.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      vendorId: z.number().describe('Vendor ID')
    })
  )
  .output(
    z.object({
      vendorId: z.number().describe('Vendor ID'),
      name: z.string().describe('Vendor name'),
      description: z.string().nullable().describe('Vendor description'),
      primaryContactId: z.number().nullable().describe('Primary contact ID'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      updatedAt: z.string().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let vendor = await client.getVendor(ctx.input.vendorId);

    return {
      output: mapVendor(vendor),
      message: `Retrieved vendor **#${vendor.id}**: "${vendor.name}"`
    };
  })
  .build();
