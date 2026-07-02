import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

export let newLocation = SlateTrigger.create(spec, {
  name: 'New Location',
  key: 'new_location',
  description: 'Triggers when a new location is added to a map in Mapulus.'
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the new location'),
      title: z.string().optional().describe('Title of the location'),
      label: z.string().optional().describe('Map marker label'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      address: z.string().optional().describe('Street address'),
      externalId: z.string().optional().describe('External reference ID'),
      layerId: z.string().optional().describe('Layer the location belongs to'),
      mapId: z.string().optional().describe('Map the location belongs to'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Unique identifier of the new location'),
      title: z.string().optional().describe('Title of the location'),
      label: z.string().optional().describe('Map marker label'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      address: z.string().optional().describe('Street address'),
      externalId: z.string().optional().describe('External reference ID'),
      layerId: z.string().optional().describe('Layer the location belongs to'),
      mapId: z.string().optional().describe('Map the location belongs to'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MapulusClient(ctx.auth.token);
      let lastSeenIds: string[] = ctx.state?.lastSeenIds ?? [];
      let lastPollTime: string | null = ctx.state?.lastPollTime ?? null;

      let maps = await client.listMaps(false);
      let allLocations: any[] = [];

      for (let map of maps) {
        let locations = await client.findLocations({ mapId: map.id });
        if (Array.isArray(locations)) {
          allLocations.push(...locations);
        }
      }

      // Filter to only new locations
      let newLocations = allLocations.filter(loc => {
        if (lastSeenIds.includes(loc.id)) return false;
        if (lastPollTime && loc.created_at && loc.created_at <= lastPollTime) return false;
        return true;
      });

      // Sort newest first
      newLocations.sort((a, b) => {
        let aTime = a.created_at ?? '';
        let bTime = b.created_at ?? '';
        return bTime.localeCompare(aTime);
      });

      // Track all current IDs for deduplication
      let currentIds = allLocations.map(loc => loc.id);
      let now = new Date().toISOString();

      return {
        inputs: newLocations.map(loc => ({
          locationId: loc.id,
          title: loc.title,
          label: loc.label,
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          externalId: loc.external_id,
          layerId: loc.layer_id,
          mapId: loc.map_id,
          customAttributes: loc.custom_attributes,
          createdAt: loc.created_at
        })),
        updatedState: {
          lastSeenIds: currentIds,
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'location.created',
        id: ctx.input.locationId,
        output: {
          locationId: ctx.input.locationId,
          title: ctx.input.title,
          label: ctx.input.label,
          latitude: ctx.input.latitude,
          longitude: ctx.input.longitude,
          address: ctx.input.address,
          externalId: ctx.input.externalId,
          layerId: ctx.input.layerId,
          mapId: ctx.input.mapId,
          customAttributes: ctx.input.customAttributes,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
