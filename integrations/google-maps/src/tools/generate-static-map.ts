import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

export let generateStaticMapTool = SlateTool.create(spec, {
  name: 'Generate Static Map',
  key: 'generate_static_map',
  description: `Generate a static map image URL. Creates a customizable map with markers, paths, and various styles. The returned URL points directly to a PNG/JPG image that can be embedded in web pages or documents.`,
  instructions: [
    'Markers format: "color:red|label:A|lat,lng" — supports colors (red, blue, green, etc.) and single-character labels.',
    'Path format: "color:0x0000ff|weight:5|lat1,lng1|lat2,lng2" — draws a line between points.',
    'Either center+zoom or markers must be provided for the map to render correctly.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      center: z
        .string()
        .optional()
        .describe(
          'Map center as address or "lat,lng". Can be omitted if markers are provided.'
        ),
      zoom: z
        .number()
        .optional()
        .describe(
          'Zoom level (0=world, 21=building). Can be omitted if markers are provided.'
        ),
      width: z.number().optional().describe('Image width in pixels (default 600, max 640)'),
      height: z.number().optional().describe('Image height in pixels (default 400, max 640)'),
      scale: z.number().optional().describe('Image scale (1 or 2 for retina)'),
      format: z
        .enum(['png', 'png8', 'png32', 'gif', 'jpg', 'jpg-baseline'])
        .optional()
        .describe('Image format'),
      maptype: z
        .enum(['roadmap', 'satellite', 'terrain', 'hybrid'])
        .optional()
        .describe('Map type'),
      markers: z
        .array(z.string())
        .optional()
        .describe('Marker definitions (e.g. "color:red|label:A|40.714,-74.006")'),
      path: z
        .string()
        .optional()
        .describe(
          'Path definition (e.g. "color:0x0000ff|weight:5|40.714,-74.006|40.718,-73.998")'
        ),
      language: z.string().optional().describe('Language for map labels')
    })
  )
  .output(
    z.object({
      mapUrl: z.string().describe('URL of the generated static map image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });

    let width = ctx.input.width || 600;
    let height = ctx.input.height || 400;

    let mapUrl = client.getStaticMapUrl({
      center: ctx.input.center,
      zoom: ctx.input.zoom,
      size: `${width}x${height}`,
      scale: ctx.input.scale,
      format: ctx.input.format,
      maptype: ctx.input.maptype,
      markers: ctx.input.markers,
      path: ctx.input.path,
      language: ctx.input.language
    });

    let message = `Generated static map (${width}×${height}${ctx.input.maptype ? `, ${ctx.input.maptype}` : ''}).`;

    return {
      output: { mapUrl },
      message
    };
  })
  .build();
