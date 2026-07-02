import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let boundingBoxSchema = z.object({
  xmin: z.number().describe('Left edge x coordinate'),
  ymin: z.number().describe('Top edge y coordinate'),
  xmax: z.number().describe('Right edge x coordinate'),
  ymax: z.number().describe('Bottom edge y coordinate')
});

export let plateRecognized = SlateTrigger.create(spec, {
  name: 'Plate Recognized',
  key: 'plate_recognized',
  description:
    'Triggers when a license plate recognition request completes via the Snapshot API. Fires for every recognition call, even when no plate is found. Configure the webhook URL in the Plate Recognizer dashboard under Snapshot Cloud or SDK webhook settings.'
})
  .input(
    z.object({
      hookId: z.number().describe('Webhook ID'),
      event: z.string().describe('Event type (image.done)'),
      filename: z.string().describe('Processed image filename'),
      timestamp: z.string().describe('Recognition timestamp'),
      cameraId: z.string().nullable().describe('Camera ID if provided'),
      processingTime: z.number().describe('Processing time in milliseconds'),
      results: z.array(z.any()).describe('Raw plate recognition results'),
      callsUsed: z.number().optional().describe('API calls used this period'),
      maxCalls: z.number().optional().describe('Maximum API calls allowed')
    })
  )
  .output(
    z.object({
      filename: z.string().describe('Processed image filename'),
      timestamp: z.string().describe('Recognition timestamp'),
      cameraId: z.string().nullable().describe('Camera ID if provided'),
      processingTime: z.number().describe('Processing time in milliseconds'),
      plateCount: z.number().describe('Number of plates detected'),
      plates: z
        .array(
          z.object({
            plate: z.string().describe('Decoded license plate text'),
            score: z.number().describe('OCR confidence score (0-1)'),
            dscore: z.number().describe('Detection confidence score (0-1)'),
            box: boundingBoxSchema.describe('Bounding box of the plate'),
            regionCode: z.string().optional().describe('Region code of the plate'),
            regionScore: z.number().optional().describe('Region classification confidence'),
            vehicleType: z.string().optional().describe('Vehicle type (e.g. Sedan, SUV)'),
            vehicleScore: z.number().optional().describe('Vehicle type confidence'),
            vehicleBox: boundingBoxSchema.optional().describe('Bounding box of the vehicle')
          })
        )
        .describe('Detected license plates'),
      callsUsed: z.number().optional().describe('API calls used this period'),
      maxCalls: z.number().optional().describe('Maximum API calls allowed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else if (contentType.includes('multipart/form-data')) {
        let formData = await ctx.request.formData();
        let jsonStr = formData.get('json');
        if (typeof jsonStr === 'string') {
          data = JSON.parse(jsonStr);
        } else {
          data = {};
        }
      } else {
        data = await ctx.request.json();
      }

      let hook = data.hook || {};
      let payload = data.data || {};

      return {
        inputs: [
          {
            hookId: hook.id ?? 0,
            event: hook.event ?? 'image.done',
            filename: payload.filename ?? '',
            timestamp: payload.timestamp ?? '',
            cameraId: payload.camera_id ?? null,
            processingTime: payload.processing_time ?? 0,
            results: payload.results ?? [],
            callsUsed: payload.usage?.calls,
            maxCalls: payload.usage?.max_calls
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let plates = (ctx.input.results || []).map((r: any) => ({
        plate: r.plate ?? '',
        score: r.score ?? 0,
        dscore: r.dscore ?? 0,
        box: r.box ?? { xmin: 0, ymin: 0, xmax: 0, ymax: 0 },
        regionCode: r.region?.code,
        regionScore: r.region?.score,
        vehicleType: r.vehicle?.type,
        vehicleScore: r.vehicle?.score,
        vehicleBox: r.vehicle?.box
      }));

      return {
        type: 'image.done',
        id: `${ctx.input.hookId}-${ctx.input.timestamp}-${ctx.input.filename}`,
        output: {
          filename: ctx.input.filename,
          timestamp: ctx.input.timestamp,
          cameraId: ctx.input.cameraId,
          processingTime: ctx.input.processingTime,
          plateCount: plates.length,
          plates,
          callsUsed: ctx.input.callsUsed,
          maxCalls: ctx.input.maxCalls
        }
      };
    }
  })
  .build();
