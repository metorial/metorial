import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMap = SlateTool.create(spec, {
  name: 'Get Map',
  key: 'get_map',
  description: `Retrieve detailed information about a Felt map, including its title, description, basemap, layers, elements, layer groups, element groups, and permissions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to retrieve')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the map'),
      title: z.string().nullable().describe('Title of the map'),
      url: z.string().describe('URL to view the map'),
      publicAccess: z.string().nullable().describe('Access level'),
      basemap: z.string().nullable().describe('Basemap style'),
      createdAt: z.string().nullable().describe('Creation timestamp'),
      visitedAt: z.string().nullable().describe('Last visited timestamp'),
      thumbnailUrl: z.string().nullable().describe('Thumbnail image URL'),
      projectId: z.string().nullable().describe('Project ID the map belongs to'),
      folderId: z.string().nullable().describe('Folder ID the map belongs to'),
      layers: z.array(z.record(z.string(), z.unknown())).describe('Layers on the map'),
      layerGroups: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Layer groups on the map'),
      elements: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Elements (GeoJSON FeatureCollection)'),
      elementGroups: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Element groups on the map')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let map = await client.getMap(ctx.input.mapId);

    return {
      output: {
        mapId: map.id,
        title: map.title ?? null,
        url: map.url,
        publicAccess: map.public_access ?? null,
        basemap: map.basemap ?? null,
        createdAt: map.created_at ?? null,
        visitedAt: map.visited_at ?? null,
        thumbnailUrl: map.thumbnail_url ?? null,
        projectId: map.project_id ?? null,
        folderId: map.folder_id ?? null,
        layers: map.layers ?? [],
        layerGroups: map.layer_groups ?? [],
        elements: map.elements ?? null,
        elementGroups: map.element_groups ?? []
      },
      message: `Retrieved map **${map.title || 'Untitled'}** with ${(map.layers ?? []).length} layer(s) and ${(map.elements?.features ?? []).length} element(s).`
    };
  })
  .build();
