import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let staticImageTool = SlateTool.create(spec, {
  name: 'Static Map Image',
  key: 'static_image',
  description: `Generate a URL for a static map image rendered from a Mapbox style. Produces a direct image URL (PNG) with custom dimensions, center point, zoom level, and optional markers or overlays — no browser required.`,
  instructions: [
    'Specify a styleId (e.g., "streets-v12", "satellite-v9", "dark-v11") or a custom style ID.',
    'Common Mapbox styles: streets-v12, outdoors-v12, light-v11, dark-v11, satellite-v9, satellite-streets-v12.',
    'For Mapbox default styles, set styleOwner to "mapbox".',
    'The overlay parameter accepts GeoJSON, markers (e.g., "pin-s+ff0000(-73.99,40.73)"), or encoded polylines.'
  ],
  constraints: [
    'Maximum image dimensions: 1280x1280 pixels.',
    'Rate limit: 1,250 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      styleId: z
        .string()
        .describe('Map style ID (e.g., "streets-v12", "dark-v11", or a custom style ID)'),
      longitude: z.number().describe('Center longitude'),
      latitude: z.number().describe('Center latitude'),
      zoom: z.number().describe('Zoom level (0-22)'),
      width: z.number().describe('Image width in pixels (max 1280)'),
      height: z.number().describe('Image height in pixels (max 1280)'),
      bearing: z.number().optional().describe('Map bearing/rotation in degrees (default 0)'),
      pitch: z.number().optional().describe('Map pitch/tilt in degrees (default 0)'),
      retina: z.boolean().optional().describe('Generate @2x retina image'),
      overlay: z.string().optional().describe('GeoJSON, marker, or path overlay string'),
      styleOwner: z
        .string()
        .optional()
        .describe(
          'Style owner username (default: your username, use "mapbox" for built-in styles)'
        ),
      attribution: z.boolean().optional().describe('Include attribution (default true)'),
      logo: z.boolean().optional().describe('Include Mapbox logo (default true)'),
      padding: z
        .string()
        .optional()
        .describe('Padding around the viewport as "top,right,bottom,left"')
    })
  )
  .output(
    z.object({
      imageUrl: z.string().describe('Direct URL to the static map image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let imageUrl = client.getStaticImageUrl({
      styleId: ctx.input.styleId,
      longitude: ctx.input.longitude,
      latitude: ctx.input.latitude,
      zoom: ctx.input.zoom,
      width: ctx.input.width,
      height: ctx.input.height,
      bearing: ctx.input.bearing,
      pitch: ctx.input.pitch,
      retina: ctx.input.retina,
      overlay: ctx.input.overlay,
      styleOwner: ctx.input.styleOwner,
      attribution: ctx.input.attribution,
      logo: ctx.input.logo,
      padding: ctx.input.padding
    });

    return {
      output: { imageUrl },
      message: `Generated static map image URL (${ctx.input.width}x${ctx.input.height}, zoom ${ctx.input.zoom}).`
    };
  });
