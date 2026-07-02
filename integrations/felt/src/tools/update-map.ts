import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateMap = SlateTool.create(spec, {
  name: 'Update Map',
  key: 'update_map',
  description: `Update a Felt map's properties including title, description, basemap style, access level, table settings, and viewer permissions. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map to update'),
      title: z.string().optional().describe('New title for the map'),
      description: z.string().optional().describe('New description for the map legend'),
      basemap: z
        .string()
        .optional()
        .describe(
          'Basemap style: "default", "light", "dark", "satellite", a raster tile URL, or hex color'
        ),
      publicAccess: z
        .enum(['private', 'view_only', 'view_and_comment', 'view_comment_and_edit'])
        .optional()
        .describe('Access level for the map'),
      tableSettings: z
        .object({
          defaultTableLayerId: z
            .string()
            .optional()
            .describe('Default layer ID for the table view'),
          viewersCanOpenTable: z
            .boolean()
            .optional()
            .describe('Whether viewers can open the table view')
        })
        .optional()
        .describe('Table view settings'),
      viewerPermissions: z
        .object({
          canDuplicateMap: z
            .boolean()
            .optional()
            .describe('Whether viewers can duplicate the map'),
          canExportData: z.boolean().optional().describe('Whether viewers can export data'),
          canSeeMapPresence: z
            .boolean()
            .optional()
            .describe('Whether viewers can see other users on the map')
        })
        .optional()
        .describe('Viewer permission settings')
    })
  )
  .output(
    z.object({
      mapId: z.string().describe('ID of the updated map'),
      title: z.string().nullable().describe('Updated title'),
      url: z.string().describe('URL to view the map'),
      publicAccess: z.string().nullable().describe('Updated access level')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let map = await client.updateMap(ctx.input.mapId, {
      title: ctx.input.title,
      description: ctx.input.description,
      basemap: ctx.input.basemap,
      publicAccess: ctx.input.publicAccess,
      tableSettings: ctx.input.tableSettings,
      viewerPermissions: ctx.input.viewerPermissions
    });

    return {
      output: {
        mapId: map.id,
        title: map.title ?? null,
        url: map.url,
        publicAccess: map.public_access ?? null
      },
      message: `Updated map **${map.title || 'Untitled'}**.`
    };
  })
  .build();
