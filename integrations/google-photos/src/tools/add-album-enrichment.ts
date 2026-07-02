import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

let locationSchema = z.object({
  locationName: z.string().describe('Name of the location'),
  latitude: z.number().min(-90).max(90).optional().describe('Latitude coordinate (-90 to 90)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Longitude coordinate (-180 to 180)')
});

export let addAlbumEnrichment = SlateTool.create(spec, {
  name: 'Add Album Enrichment',
  key: 'add_album_enrichment',
  description: `Add a text, location, or map enrichment to an album. Enrichments provide context between media items in an album. Specify exactly one enrichment type per call.`,
  instructions: [
    'Provide exactly one of: text, location, or map enrichment.',
    'For map enrichments, provide both origin and destination locations.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.addAlbumEnrichment)
  .input(
    z.object({
      albumId: z.string().describe('The ID of the album to add the enrichment to'),
      text: z.string().optional().describe('Text content for a text enrichment'),
      location: locationSchema
        .optional()
        .describe('Location details for a location enrichment'),
      mapOrigin: locationSchema.optional().describe('Origin location for a map enrichment'),
      mapDestination: locationSchema
        .optional()
        .describe('Destination location for a map enrichment'),
      position: z
        .enum(['FIRST_IN_ALBUM', 'LAST_IN_ALBUM', 'AFTER_MEDIA_ITEM', 'AFTER_ENRICHMENT_ITEM'])
        .optional()
        .describe('Position in the album to place the enrichment (default: LAST_IN_ALBUM)'),
      relativeMediaItemId: z
        .string()
        .optional()
        .describe(
          'Media item ID to place enrichment after (when position is AFTER_MEDIA_ITEM)'
        ),
      relativeEnrichmentItemId: z
        .string()
        .optional()
        .describe(
          'Enrichment item ID to place enrichment after (when position is AFTER_ENRICHMENT_ITEM)'
        )
    })
  )
  .output(
    z.object({
      enrichmentItemId: z.string().describe('ID of the created enrichment item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let enrichment: Record<string, any> = {};
    let enrichmentType = '';

    if (ctx.input.text) {
      enrichment.textEnrichment = { text: ctx.input.text };
      enrichmentType = 'text';
    } else if (ctx.input.location) {
      let loc: Record<string, any> = { locationName: ctx.input.location.locationName };
      if (
        ctx.input.location.latitude !== undefined &&
        ctx.input.location.longitude !== undefined
      ) {
        loc.latlng = {
          latitude: ctx.input.location.latitude,
          longitude: ctx.input.location.longitude
        };
      }
      enrichment.locationEnrichment = { location: loc };
      enrichmentType = 'location';
    } else if (ctx.input.mapOrigin && ctx.input.mapDestination) {
      let buildLocation = (l: {
        locationName: string;
        latitude?: number;
        longitude?: number;
      }) => {
        let loc: Record<string, any> = { locationName: l.locationName };
        if (l.latitude !== undefined && l.longitude !== undefined) {
          loc.latlng = { latitude: l.latitude, longitude: l.longitude };
        }
        return loc;
      };
      enrichment.mapEnrichment = {
        origin: buildLocation(ctx.input.mapOrigin),
        destination: buildLocation(ctx.input.mapDestination)
      };
      enrichmentType = 'map';
    } else {
      throw new Error(
        'Provide exactly one enrichment type: text, location, or map (origin + destination).'
      );
    }

    let albumPosition: Record<string, any> = {
      position: ctx.input.position || 'LAST_IN_ALBUM'
    };
    if (ctx.input.relativeMediaItemId) {
      albumPosition.relativeMediaItemId = ctx.input.relativeMediaItemId;
    }
    if (ctx.input.relativeEnrichmentItemId) {
      albumPosition.relativeEnrichmentItemId = ctx.input.relativeEnrichmentItemId;
    }

    let result = await client.addEnrichmentToAlbum(
      ctx.input.albumId,
      enrichment,
      albumPosition
    );

    return {
      output: {
        enrichmentItemId: result.enrichmentItem.id
      },
      message: `Added **${enrichmentType}** enrichment to album.`
    };
  })
  .build();
