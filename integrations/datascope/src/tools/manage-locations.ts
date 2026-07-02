import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve all locations configured in DataScope. Locations are used as metadata references in forms and task assignments, and include name, address, GPS coordinates, and contact information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(z.any()).describe('Array of location records'),
      count: z.number().describe('Number of locations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.getLocations();
    let locationsArray = Array.isArray(results) ? results : [];

    return {
      output: {
        locations: locationsArray,
        count: locationsArray.length
      },
      message: `Retrieved **${locationsArray.length}** location(s).`
    };
  })
  .build();

export let createLocation = SlateTool.create(spec, {
  name: 'Create Location',
  key: 'create_location',
  description: `Create a new location in DataScope. Locations can be referenced in forms and task assignments. Supports setting name, address, GPS coordinates, and contact information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Location name (required)'),
      description: z.string().optional().describe('Location description'),
      code: z.string().optional().describe('Location code identifier'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country'),
      latitude: z.number().optional().describe('GPS latitude'),
      longitude: z.number().optional().describe('GPS longitude'),
      phone: z.string().optional().describe('Phone number'),
      companyCode: z.string().optional().describe('Company code'),
      companyName: z.string().optional().describe('Company name'),
      email: z.string().optional().describe('Email address')
    })
  )
  .output(
    z.object({
      location: z.any().describe('Created location record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createLocation(ctx.input);

    return {
      output: {
        location: result
      },
      message: `Created location **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateLocation = SlateTool.create(spec, {
  name: 'Update Location',
  key: 'update_location',
  description: `Update an existing location in DataScope by its ID. Any provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to update'),
      name: z.string().optional().describe('New location name'),
      description: z.string().optional().describe('New location description'),
      code: z.string().optional().describe('New location code'),
      address: z.string().optional().describe('New street address'),
      city: z.string().optional().describe('New city'),
      country: z.string().optional().describe('New country'),
      latitude: z.number().optional().describe('New GPS latitude'),
      longitude: z.number().optional().describe('New GPS longitude'),
      phone: z.string().optional().describe('New phone number'),
      companyCode: z.string().optional().describe('New company code'),
      companyName: z.string().optional().describe('New company name'),
      email: z.string().optional().describe('New email address')
    })
  )
  .output(
    z.object({
      location: z.any().describe('Updated location record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { locationId, ...fields } = ctx.input;
    let result = await client.updateLocation(locationId, fields);

    return {
      output: {
        location: result
      },
      message: `Updated location **${locationId}**.`
    };
  })
  .build();
