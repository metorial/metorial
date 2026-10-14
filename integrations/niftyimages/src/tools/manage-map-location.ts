import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z
  .object({
    name: z
      .string()
      .optional()
      .describe('Name of the location, stored in the Name map property.'),
    address: z.string().optional().describe('Street address.'),
    city: z.string().optional().describe('City.'),
    state: z.string().optional().describe('State or province.'),
    zip: z.string().optional().describe('ZIP or postal code.'),
    country: z.string().optional().describe('Country.'),
    latitude: z.number().optional().describe('Latitude coordinate.'),
    longitude: z.number().optional().describe('Longitude coordinate.'),
    phone: z.string().optional().describe('Phone number, stored in the Phone map property.'),
    url: z
      .string()
      .optional()
      .describe('Website URL, stored in the StoreWebPage map property.'),
    icon: z
      .string()
      .optional()
      .describe(
        'Custom icon URL, stored in the Icon map property. Configure that property in the map designer.'
      ),
    properties: z
      .array(
        z.object({
          name: z.string().describe('Exact name of a custom property configured on the map.'),
          value: z.any().describe('Value for that map property.')
        })
      )
      .optional()
      .describe(
        'Custom map properties. These override convenience fields with the same property name.'
      )
  })
  .describe('Location details.');

export let manageMapLocation = SlateTool.create(spec, {
  name: 'Manage Map Location',
  key: 'manage_map_location',
  description: `Add, update, or delete a location on a NiftyImages map. Maps allow you to detect a subscriber's location and show them your nearest store or location.
Custom location properties can supply names, phone numbers, links, and icons when configured in the map designer. Use the **List Maps** tool to find available map URLs.`,
  instructions: [
    'Use the "List Maps" tool first to find the mapId.',
    'For updating or deleting, use the NiftyID or LocationID from a List Maps search result, and select the corresponding locationIdType.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z
        .string()
        .describe('Numeric map image ID, or the map URL returned by List Maps.'),
      action: z.enum(['add', 'update', 'delete']).describe('The action to perform.'),
      locationId: z
        .string()
        .optional()
        .describe(
          'The NiftyID or imported LocationID from a List Maps search (required for update and delete actions).'
        ),
      locationIdType: z
        .enum(['nifty_id', 'location_id'])
        .optional()
        .describe(
          'Which returned identifier locationId contains. Defaults to nifty_id; choose location_id for an imported LocationID.'
        ),
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
    let location = ctx.input.location;
    if (
      ctx.input.action === 'add' &&
      location &&
      (location.latitude === undefined) !== (location.longitude === undefined)
    ) {
      throw createApiServiceError(
        'Provide both latitude and longitude when supplying coordinates.'
      );
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.location) {
        throw createApiServiceError('Location data is required when adding a location.');
      }
      if (!ctx.input.location.address && ctx.input.location.latitude === undefined) {
        throw createApiServiceError(
          'Provide an address or both latitude and longitude when adding a location.'
        );
      }
      result = await client.addMapLocation(ctx.input.mapId, ctx.input.location);
      return {
        output: { success: true, result },
        message: `Successfully added location${ctx.input.location.name ? ` **${ctx.input.location.name}**` : ''} to map.`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.locationId) {
        throw createApiServiceError('Location ID is required for update action.');
      }
      if (!ctx.input.location) {
        throw createApiServiceError('Location data is required for update action.');
      }
      result = await client.updateMapLocation(
        ctx.input.mapId,
        ctx.input.locationId,
        ctx.input.location,
        ctx.input.locationIdType
      );
      return {
        output: { success: true, result },
        message: `Successfully updated location **${ctx.input.locationId}** on map.`
      };
    } else {
      if (!ctx.input.locationId) {
        throw createApiServiceError('Location ID is required for delete action.');
      }
      result = await client.deleteMapLocation(
        ctx.input.mapId,
        ctx.input.locationId,
        ctx.input.locationIdType
      );
      return {
        output: { success: true, result },
        message: `Successfully deleted location **${ctx.input.locationId}** from map.`
      };
    }
  })
  .build();
