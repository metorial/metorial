import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createMap = SlateTool.create(spec, {
  name: 'Create Map',
  key: 'create_map',
  description: `Create a new map in Felt. Configure the map's title, description, initial viewport (coordinates and zoom), basemap style, and access level. You can also provide URLs to add raster tile layers on creation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Title of the map (defaults to "Untitled Map")'),
      description: z.string().optional().describe('Description shown in the map legend'),
      lat: z.number().optional().describe('Initial latitude for the map viewport'),
      lon: z.number().optional().describe('Initial longitude for the map viewport'),
      zoom: z.number().optional().describe('Initial zoom level for the map viewport'),
      basemap: z
        .string()
        .optional()
        .describe(
          'Basemap style: "default", "light", "dark", "satellite", a raster tile URL, or a hex color'
        ),
      publicAccess: z
        .enum(['private', 'view_only', 'view_and_comment', 'view_comment_and_edit'])
        .optional()
        .describe('Access level for the map'),
      layerUrls: z
        .array(z.string())
        .optional()
        .describe('Tile URLs for raster layers to add on creation')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the created map'),
      title: z.string().nullable().describe('Title of the map'),
      url: z.string().describe('URL to view the map in Felt'),
      publicAccess: z.string().nullable().describe('Access level of the map'),
      createdAt: z.string().nullable().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let map = await client.createMap({
      title: ctx.input.title,
      description: ctx.input.description,
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      zoom: ctx.input.zoom,
      basemap: ctx.input.basemap,
      publicAccess: ctx.input.publicAccess,
      layerUrls: ctx.input.layerUrls
    });

    return {
      output: {
        mapId: map.id,
        title: map.title ?? null,
        url: map.url,
        publicAccess: map.public_access ?? null,
        createdAt: map.created_at ?? null
      },
      message: `Created map **${map.title || 'Untitled Map'}** — [Open in Felt](${map.url})`
    };
  })
  .build();
