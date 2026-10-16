import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let boxSchema = z.object({
  xmin: z.number(),
  ymin: z.number(),
  xmax: z.number(),
  ymax: z.number()
});

// Keep all provider context except embedded file payloads, including nested ones.
let withoutFilePayloads = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutFilePayloads);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => {
          let normalized = key.replace(/[_-]/g, '').toLowerCase();
          return (
            !normalized.includes('base64') &&
            ![
              'image',
              'images',
              'upload',
              'content',
              'contents',
              'filecontent',
              'filecontents',
              'imagedata',
              'imagebytes',
              'filebytes'
            ].includes(normalized)
          );
        })
        .map(([key, item]) => [key, withoutFilePayloads(item)])
    );
  }
  return value;
};

let verifiedImageMimeType = (bytes: Buffer): string | undefined => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  let signature = bytes.subarray(0, 6).toString('ascii');
  if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 14 && bytes.toString('ascii', 0, 2) === 'BM') return 'image/bmp';
  if (
    bytes.length >= 8 &&
    (bytes.subarray(0, 4).equals(Buffer.from([0x49, 0x49, 0x2a, 0])) ||
      bytes.subarray(0, 4).equals(Buffer.from([0x4d, 0x4d, 0, 0x2a])))
  ) {
    return 'image/tiff';
  }
  if (
    bytes.length >= 16 &&
    bytes.toString('ascii', 4, 8) === 'ftyp' &&
    ['avif', 'avis'].includes(bytes.toString('ascii', 8, 12))
  ) {
    return 'image/avif';
  }
  return undefined;
};

export let blurImageFile = SlateTool.create(spec, {
  name: 'Blur Plates and Faces to a File',
  key: 'blur_image_file',
  description:
    'Blur license plates and faces and prepare the processed image for download. Returns image metadata and detection coordinates. Detection-only responses remain successful when the provider produces no file.',
  instructions: [
    'Provide imageUrl or imageBase64. If both are supplied, imageUrl takes priority.',
    'Set platesIntensity and/or facesIntensity from 1 to 10 to enable blurring. Omitting both requests detection coordinates without requiring a file.',
    'Returned files must contain nonempty image bytes with a recognizable JPEG, PNG, GIF, WebP, BMP, TIFF, or AVIF signature. Provider MIME types must agree with the detected format.'
  ],
  constraints: ['Maximum image size is 3 MB.', 'Rate limit applies per account subscription.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      imageUrl: z.string().optional().describe('URL of the image to blur'),
      imageBase64: z.string().optional().describe('Base64-encoded image data'),
      platesIntensity: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('License plate blur intensity from 1 to 10'),
      facesIntensity: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Face blur intensity from 1 to 10'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Region codes to improve plate detection accuracy'),
      cameraId: z.string().optional().describe('Unique camera identifier')
    })
  )
  .output(
    z.object({
      fileProduced: z
        .boolean()
        .describe('Whether the provider produced a valid processed image'),
      filename: z.string().optional().describe('Actual provider filename when supplied'),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Actual provider MIME type when supplied and verified against the image signature'
        ),
      verifiedMimeType: z
        .string()
        .optional()
        .describe('Image format identified from the decoded file signature'),
      sizeBytes: z.number().optional().describe('Actual number of decoded image bytes'),
      plates: z.array(
        z.object({
          box: boxSchema.optional(),
          score: z.number().optional(),
          polygon: z
            .array(z.array(z.number()))
            .optional()
            .describe('Accurate plate polygon coordinates'),
          result: z
            .unknown()
            .optional()
            .describe('Original plate detection context without embedded file payloads')
        })
      ),
      faces: z.array(z.object({ box: boxSchema.optional(), score: z.number().optional() })),
      raw: z
        .unknown()
        .optional()
        .describe(
          'Original response metadata and detection context with embedded file payloads removed'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.imageUrl && !ctx.input.imageBase64) {
      throw createApiServiceError('Provide imageUrl or imageBase64 to blur an image.');
    }
    let result = await new Client({ token: ctx.auth.token }).blurImage({
      imageUrl: ctx.input.imageUrl,
      imageBase64: ctx.input.imageBase64,
      plates: ctx.input.platesIntensity,
      faces: ctx.input.facesIntensity,
      regions: ctx.input.regions,
      cameraId: ctx.input.cameraId
    });
    let filename: string | undefined;
    let mimeType: string | undefined;
    let verifiedMimeType: string | undefined;
    let sizeBytes: number | undefined;
    let fileProduced = result.blur != null;
    if (fileProduced) {
      let encoded =
        typeof result.blur.base64 === 'string' ? result.blur.base64.replace(/\s/g, '') : '';
      if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
        throw createApiServiceError(
          'Plate Recognizer returned an invalid encoded blurred image.'
        );
      }
      let bytes = Buffer.from(encoded, 'base64');
      if (
        bytes.byteLength === 0 ||
        bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
      ) {
        throw createApiServiceError(
          'Plate Recognizer returned empty or invalid blurred image bytes.'
        );
      }
      verifiedMimeType = verifiedImageMimeType(bytes);
      if (!verifiedMimeType) {
        throw createApiServiceError(
          'Plate Recognizer returned an image format whose file signature could not be verified.'
        );
      }
      if (result.blur.content_type != null) {
        let suppliedMimeType: unknown = result.blur.content_type;
        if (typeof suppliedMimeType !== 'string') {
          throw createApiServiceError(
            'Plate Recognizer returned an invalid blurred image MIME type.'
          );
        }
        mimeType = suppliedMimeType;
        let normalized = suppliedMimeType.split(';')[0]?.trim().toLowerCase();
        if (
          normalized !== verifiedMimeType &&
          !(normalized === 'image/jpg' && verifiedMimeType === 'image/jpeg')
        ) {
          throw createApiServiceError(
            'Plate Recognizer returned a MIME type that does not match the blurred image file signature.'
          );
        }
      }
      filename = typeof result.blur.filename === 'string' ? result.blur.filename : undefined;
      sizeBytes = bytes.byteLength;
      await ctx.addAttachment({
        type: 'content',
        content: new Response(bytes),
        filename,
        mimeType: mimeType ?? verifiedMimeType
      });
    }
    let plates = (result.plates ?? []).map((plate: any) => ({
      box: plate.box,
      score: plate.score,
      polygon: plate.polygon,
      result: withoutFilePayloads(plate.result)
    }));
    let faces = (result.faces ?? []).map((face: any) => ({
      box: face.box,
      score: face.score
    }));
    return {
      output: {
        fileProduced,
        filename,
        mimeType,
        verifiedMimeType,
        sizeBytes,
        plates,
        faces,
        raw: withoutFilePayloads(result)
      },
      message: fileProduced
        ? `Prepared a blurred image with **${plates.length}** plate(s) and **${faces.length}** face(s).`
        : `Detected **${plates.length}** plate(s) and **${faces.length}** face(s). The provider produced no blurred image.`
    };
  })
  .build();
