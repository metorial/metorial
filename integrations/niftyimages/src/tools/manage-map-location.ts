import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z
  .object({
    name: z.string().optional().describe('Name of the location.'),
    address: z.string().optional().describe('Street address.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    zip: z.string().optional().describe('ZIP or postal code.'),
    country: z.string().optional().describe('Country.'),
    latitude: z.number().optional().describe('Latitude coordinate.'),
    longitude: z.number().optional().describe('Longitude coordinate.'),
    phone: z.string().optional().describe('Phone number.'),
    url: z.string().optional().describe('Website URL.'),
    icon: z.string().optional().describe('Custom icon URL for this location on the map.')
  })
  .describe('Location details.');

export let manageMapLocation = SlateTool.create(spec, {
  name: 'Manage Map Location',
  key: 'manage_map_location',
  description: `Add, update, or delete a location on a NiftyImages map. Maps allow you to detect a subscriber's location and show them your nearest store or location.
Each location can have its own unique icon. Use the **List Maps** tool to find available maps and their IDs.`,
  instructions: [
    'Use the "List Maps" tool first to find the mapId.',
    'For updating or deleting, you need the locationId from the map details or a search result.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('The ID of the map to manage locations on.'),
      action: z.enum(['add', 'update', 'delete']).describe('The action to perform.'),
      locationId: z
        .string()
        .optional()
        .describe('The location ID (required for update and delete actions).'),
      location: locationSchema
        .optional()
        .describe('The location data (required for add and update actions).')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      result: z.any().optional().describe('The API response data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add') {
      if (!ctx.input.location) {
        throw new Error('Location data is required when adding a location.');
      }
      result = await client.addMapLocation(ctx.input.mapId, ctx.input.location);
      return {
        output: { success: true, result },
        message: `Successfully added location${ctx.input.location.name ? ` **${ctx.input.location.name}**` : ''} to map.`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.locationId) {
        throw new Error('Location ID is required for update action.');
      }
      if (!ctx.input.location) {
        throw new Error('Location data is required for update action.');
      }
      result = await client.updateMapLocation(
        ctx.input.mapId,
        ctx.input.locationId,
        ctx.input.location
      );
      return {
        output: { success: true, result },
        message: `Successfully updated location **${ctx.input.locationId}** on map.`
      };
    } else {
      if (!ctx.input.locationId) {
        throw new Error('Location ID is required for delete action.');
      }
      result = await client.deleteMapLocation(ctx.input.mapId, ctx.input.locationId);
      return {
        output: { success: true, result },
        message: `Successfully deleted location **${ctx.input.locationId}** from map.`
      };
    }
  })
  .build();
