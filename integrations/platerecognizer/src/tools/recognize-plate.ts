import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let boundingBoxSchema = z.object({
  xmin: z.number().describe('Left edge x coordinate'),
  ymin: z.number().describe('Top edge y coordinate'),
  xmax: z.number().describe('Right edge x coordinate'),
  ymax: z.number().describe('Bottom edge y coordinate')
});

let plateResultSchema = z.object({
  plate: z.string().describe('Decoded license plate text'),
  score: z.number().describe('OCR confidence score (0-1)'),
  dscore: z.number().describe('Detection confidence score (0-1)'),
  box: boundingBoxSchema.describe('Bounding box of the license plate'),
  region: z
    .object({
      code: z.string().describe('Region code (e.g. "us-ca", "gb")'),
      score: z.number().describe('Region classification confidence')
    })
    .optional()
    .describe('Detected plate region'),
  vehicle: z
    .object({
      type: z.string().describe('Vehicle type (e.g. Sedan, SUV, Pickup Truck)'),
      score: z.number().describe('Vehicle type confidence'),
      box: boundingBoxSchema.describe('Bounding box of the vehicle')
    })
    .optional()
    .describe('Vehicle information'),
  candidates: z
    .array(
      z.object({
        plate: z.string().describe('Candidate plate text'),
        score: z.number().describe('Candidate confidence')
      })
    )
    .optional()
    .describe('Alternative plate readings'),
  modelMake: z
    .array(
      z.object({
        make: z.string().describe('Vehicle make'),
        model: z.string().describe('Vehicle model'),
        score: z.number().describe('Make/model confidence')
      })
    )
    .optional()
    .describe('Vehicle make and model predictions'),
  color: z
    .array(
      z.object({
        color: z.string().describe('Vehicle color'),
        score: z.number().describe('Color confidence')
      })
    )
    .optional()
    .describe('Vehicle color predictions'),
  orientation: z
    .array(
      z.object({
        orientation: z.string().describe('Vehicle orientation (Front, Rear, etc.)'),
        score: z.number().describe('Orientation confidence')
      })
    )
    .optional()
    .describe('Vehicle orientation predictions'),
  direction: z.number().optional().describe('Vehicle direction in degrees'),
  directionScore: z.number().optional().describe('Direction prediction confidence')
});

export let recognizePlate = SlateTool.create(spec, {
  name: 'Recognize License Plate',
  key: 'recognize_plate',
  description: `Read license plates from an image. Submit an image URL or base64-encoded image to detect and decode up to 5 license plates, including vehicle type, make/model, color, and orientation.
Optionally specify regions to improve accuracy, or enable vehicle detection mode to find vehicles without visible plates.`,
  instructions: [
    'Provide either an imageUrl or imageBase64, not both.',
    'Use region codes like "us-ca" (US California), "gb" (Great Britain), "fr" (France) to improve accuracy.',
    'Set mmc to true to get vehicle make, model, and color predictions.',
    'Set detectionMode to "vehicle" to detect all vehicles including those without plates.'
  ],
  constraints: [
    'Maximum image size is 3 MB.',
    'Rate limit: 1 request/sec (free), 8 requests/sec (paid).',
    'Returns up to 5 license plates per image.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image to analyze'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Region codes to improve accuracy (e.g. ["us-ca", "fr"])'),
      cameraId: z.string().optional().describe('Unique camera identifier for tracking'),
      timestamp: z.string().optional().describe('ISO 8601 UTC timestamp of the image capture'),
      mmc: z.boolean().optional().describe('Enable vehicle make, model, and color prediction'),
      direction: z
        .boolean()
        .optional()
        .describe('Predict vehicle direction (requires mmc=true)'),
      detectionMode: z
        .enum(['plate', 'vehicle'])
        .optional()
        .describe(
          'Detection mode: "plate" for plates only (default), "vehicle" for all vehicles'
        ),
      regionStrict: z
        .boolean()
        .optional()
        .describe(
          'Strict region matching - only return plates matching the specified region template'
        ),
      mode: z
        .enum(['fast', 'redaction'])
        .optional()
        .describe(
          'Processing mode: "fast" for lower latency, "redaction" for enhanced detection'
        ),
      thresholdDetection: z
        .number()
        .optional()
        .describe('Detection confidence threshold (0.0-1.0)'),
      thresholdOcr: z.number().optional().describe('OCR confidence threshold (0.0-1.0)')
    })
  )
  .output(
    z.object({
      processingTime: z.number().describe('Processing time in milliseconds'),
      filename: z.string().describe('Filename of the processed image'),
      cameraId: z.string().nullable().describe('Camera ID if provided'),
      timestamp: z.string().describe('Timestamp of the recognition'),
      results: z.array(plateResultSchema).describe('Detected license plates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let engineConfig: Record<string, unknown> = {};
    if (ctx.input.detectionMode === 'vehicle') {
      engineConfig.detection_mode = 'vehicle';
    }
    if (ctx.input.regionStrict) {
      engineConfig.region = 'strict';
    }
    if (ctx.input.mode) {
      engineConfig.mode = ctx.input.mode;
    }
    if (ctx.input.thresholdDetection !== undefined) {
      engineConfig.threshold_d = ctx.input.thresholdDetection;
    }
    if (ctx.input.thresholdOcr !== undefined) {
      engineConfig.threshold_o = ctx.input.thresholdOcr;
    }

    let result = await client.recognizePlate({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      regions: ctx.input.regions,
      cameraId: ctx.input.cameraId,
      timestamp: ctx.input.timestamp,
      mmc: ctx.input.mmc,
      direction: ctx.input.direction,
      config: Object.keys(engineConfig).length > 0 ? engineConfig : undefined
    });

    let mappedResults = (result.results || []).map((r: any) => ({
      plate: r.plate,
      score: r.score,
      dscore: r.dscore,
      box: r.box,
      region: r.region,
      vehicle: r.vehicle,
      candidates: r.candidates,
      modelMake: r.model_make,
      color: r.color,
      orientation: r.orientation,
      direction: r.direction,
      directionScore: r.direction_score
    }));

    let plateCount = mappedResults.length;
    let plateTexts = mappedResults.map((r: any) => r.plate).join(', ');

    return {
      output: {
        processingTime: result.processing_time,
        filename: result.filename,
        cameraId: result.camera_id ?? null,
        timestamp: result.timestamp,
        results: mappedResults
      },
      message:
        plateCount > 0
          ? `Recognized **${plateCount}** license plate(s): **${plateTexts}** (processed in ${result.processing_time}ms)`
          : `No license plates detected in the image (processed in ${result.processing_time}ms)`
    };
  })
  .build();
