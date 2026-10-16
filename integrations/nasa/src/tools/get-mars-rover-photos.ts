import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient, validateDate, validateInteger } from '../lib/client';
import { spec } from '../spec';

let roverPhotoSchema = z.object({
  photoId: z.number().describe('Unique photo identifier'),
  sol: z.number().describe('Martian sol (solar day) when photo was taken'),
  earthDate: z.string().describe('Earth date when photo was taken (YYYY-MM-DD)'),
  cameraName: z.string().describe('Short camera name abbreviation'),
  cameraFullName: z.string().describe('Full camera name'),
  imgSrc: z.string().describe('URL to the full-resolution photo'),
  roverName: z.string().describe('Name of the rover'),
  roverStatus: z.string().describe('Current status of the rover')
});

export let getMarsRoverPhotos = SlateTool.create(spec, {
  name: 'Get Mars Rover Photos',
  key: 'get_mars_rover_photos',
  description: `Retrieve photos taken by NASA's Mars rovers (Curiosity, Opportunity, Spirit). Filter by Martian sol, Earth date, and camera type. Returns image URLs and metadata for each photo.`,
  constraints: [
    'NASA marks the Mars Rover API archived; availability of historical data is not guaranteed.'
  ],
  instructions: [
    'Available cameras vary by rover. Common cameras include: FHAZ (Front Hazard), RHAZ (Rear Hazard), MAST (Mast Camera), CHEMCAM, MAHLI, MARDI, NAVCAM, PANCAM, MINITES.',
    'Use sol OR earthDate, not both simultaneously.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      rover: z.enum(['curiosity', 'opportunity', 'spirit']).describe('Name of the Mars rover'),
      sol: z
        .number()
        .optional()
        .describe('Martian sol (solar day) to query. Use this or earthDate.'),
      earthDate: z
        .string()
        .optional()
        .describe('Earth date (YYYY-MM-DD) to query. Use this or sol.'),
      camera: z
        .string()
        .optional()
        .describe('Camera abbreviation to filter by (e.g., FHAZ, RHAZ, MAST, NAVCAM, PANCAM)'),
      page: z
        .number()
        .optional()
        .describe('Page number for paginated results (25 photos per page)')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      photos: z.array(roverPhotoSchema).describe('List of Mars rover photos'),
      photoCount: z.number().describe('Number of photos returned')
    })
  )
  .handleInvocation(async ctx => {
    validateDate(ctx.input.earthDate, 'Earth date');
    validateInteger(ctx.input.sol, 'Sol', 0);
    validateInteger(ctx.input.page, 'Page', 1);
    if ((ctx.input.sol === undefined) === (ctx.input.earthDate === undefined)) {
      throw createApiServiceError('Provide either sol or earthDate.');
    }
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getMarsRoverPhotos({
      rover: ctx.input.rover,
      sol: ctx.input.sol,
      earthDate: ctx.input.earthDate,
      camera: ctx.input.camera,
      page: ctx.input.page
    });

    let photos = (result.photos || []).map((p: any) => ({
      photoId: p.id,
      sol: p.sol,
      earthDate: p.earth_date,
      cameraName: p.camera?.name,
      cameraFullName: p.camera?.full_name,
      imgSrc: p.img_src,
      roverName: p.rover?.name,
      roverStatus: p.rover?.status
    }));

    for (let photo of photos) {
      await ctx.addAttachment({ type: 'url', url: photo.imgSrc });
    }

    return {
      output: { raw: result, photos, photoCount: photos.length },
      message: `Retrieved **${photos.length}** photos from the **${ctx.input.rover}** rover${ctx.input.camera ? ` (${ctx.input.camera} camera)` : ''}.`
    };
  })
  .build();
