import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let epicImageSchema = z.object({
  identifier: z.string().describe('Unique image identifier'),
  caption: z.string().describe('Image caption'),
  date: z.string().describe('Date and time the image was taken'),
  imageUrl: z.string().describe('Constructed URL to the image file'),
  centroidCoordinates: z
    .object({
      lat: z.number().describe('Centroid latitude'),
      lon: z.number().describe('Centroid longitude')
    })
    .optional()
    .describe('Center point coordinates of the Earth image')
});

export let getEpicImages = SlateTool.create(spec, {
  name: 'Get EPIC Earth Images',
  key: 'get_epic_images',
  description: `Retrieve full-disc images of Earth from the EPIC (Earth Polychromatic Imaging Camera) aboard NOAA's DSCOVR spacecraft. Get daily natural-color or enhanced-color Earth imagery with metadata. Can also list available dates with imagery.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collection: z
        .enum(['natural', 'enhanced'])
        .optional()
        .describe('Image collection type. Defaults to natural color.'),
      date: z
        .string()
        .optional()
        .describe('Specific date (YYYY-MM-DD) to retrieve images for. Omit for most recent.'),
      listDates: z
        .boolean()
        .optional()
        .describe('Set to true to list all available dates instead of retrieving images.')
    })
  )
  .output(
    z.object({
      images: z.array(epicImageSchema).optional().describe('List of EPIC images'),
      availableDates: z
        .array(z.string())
        .optional()
        .describe('List of available dates when listDates is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });
    let collection = ctx.input.collection || 'natural';

    if (ctx.input.listDates) {
      let dates = await client.getEpicAvailableDates(collection);
      let dateList = (dates || []).map((d: any) => d.date || d);
      return {
        output: { availableDates: dateList },
        message: `Found **${dateList.length}** dates with available ${collection} EPIC imagery.`
      };
    }

    let result = await client.getEpicImages({ collection, date: ctx.input.date });
    let images = (result || []).map((img: any) => {
      let dateStr = img.date || '';
      let dateParts = dateStr.split(' ')[0]?.replace(/-/g, '/');
      let imageUrl = `https://epic.gsfc.nasa.gov/archive/${collection}/${dateParts}/png/${img.image}.png`;

      return {
        identifier: img.identifier,
        caption: img.caption,
        date: img.date,
        imageUrl,
        centroidCoordinates: img.centroid_coordinates
          ? {
              lat: img.centroid_coordinates.lat,
              lon: img.centroid_coordinates.lon
            }
          : undefined
      };
    });

    return {
      output: { images },
      message: `Retrieved **${images.length}** ${collection} EPIC Earth images${ctx.input.date ? ` for ${ctx.input.date}` : ''}.`
    };
  })
  .build();
