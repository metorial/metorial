import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLocation = SlateTool.create(spec, {
  name: 'Create Location',
  key: 'create_location',
  description: `Creates a new location in MaintainX. Locations can be assigned to assets, work orders, vendors, and teams.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the location'),
      address: z.string().optional().describe('Street address'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      parentId: z
        .number()
        .optional()
        .describe('Parent location ID for hierarchical relationships')
    })
  )
  .output(
    z.object({
      locationId: z.number().describe('ID of the created location'),
      name: z.string().describe('Name of the location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createLocation({
      name: ctx.input.name,
      address: ctx.input.address,
      longitude: ctx.input.longitude,
      latitude: ctx.input.latitude,
      parentId: ctx.input.parentId
    });

    let locationId = result.id ?? result.location?.id;

    return {
      output: {
        locationId,
        name: ctx.input.name
      },
      message: `Created location **"${ctx.input.name}"** (ID: ${locationId}).`
    };
  })
  .build();
