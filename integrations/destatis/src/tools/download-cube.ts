import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GenesisClient } from '../lib/client';
import { destatisValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  areaSchema,
  boundedTrimmedString,
  classifyingSelectionsSchema,
  contentsSchema,
  regionalSelectionSchema,
  updatedAfterSchema,
  validateYearOrder,
  yearSchema
} from './shared';

let downloadCubeInputSchema = z.object({
  cubeCode: boundedTrimmedString(10, 'Cube code returned by search_catalog or get_metadata.'),
  area: areaSchema,
  includeValues: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether the CSV includes provider value labels.'),
  includeMetadata: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether the CSV includes provider metadata.'),
  includeAdditionalMetadata: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the CSV includes additional provider metadata.'),
  contents: contentsSchema,
  startYear: yearSchema
    .optional()
    .describe('First period to include, written as YYYY or YYYY/YY.'),
  endYear: yearSchema
    .optional()
    .describe('Last period to include, written as YYYY or YYYY/YY.'),
  timeSlices: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Positive number of recent time slices to include.'),
  regionalSelection: regionalSelectionSchema,
  classifyingSelections: classifyingSelectionsSchema(3),
  updatedAfter: updatedAfterSchema
});

let cubeFileSchema = z.object({
  cubeCode: z.string().describe('Downloaded GENESIS-Online cube code.'),
  format: z.literal('csv').describe('Downloaded cube format.'),
  fileName: z.string().describe('Provider file name or a safe generated fallback.'),
  mimeType: z.string().describe('MIME type of the downloadable CSV file.'),
  byteLength: z.number().int().positive().describe('Downloaded file size in bytes.'),
  isArchive: z.literal(false).describe('Cube CSV downloads are not ZIP archives.')
});

export let downloadCube = SlateTool.create(spec, {
  name: 'Download Cube',
  key: 'download_cube',
  description:
    'Download filtered, linearized Destatis GENESIS-Online cube data as one downloadable CSV file with file metadata.',
  instructions: [
    'Use get_metadata to inspect cube dimensions before applying filters.',
    'Use list_variable_values to discover valid regional and classifying value codes.'
  ],
  constraints: [
    'Narrow years, time slices, contents, or variable selections if the provider rejects a large direct download.',
    'The downloadable CSV response is limited to 64 MiB; narrow the requested cube if necessary.',
    'English responses can contain provider metadata that has not been translated.',
    "This tool uses the provider's direct cube export and does not enqueue asynchronous jobs."
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(downloadCubeInputSchema)
  .output(cubeFileSchema)
  .handleInvocation(async ctx => {
    let parsed = downloadCubeInputSchema.safeParse(ctx.input);
    if (!parsed.success) {
      let detail = parsed.error.issues[0]?.message ?? 'Invalid cube download input.';
      throw destatisValidationError(`Invalid cube download input: ${detail}`);
    }
    validateYearOrder(parsed.data.startYear, parsed.data.endYear);

    let client = new GenesisClient({ token: ctx.auth.token });
    let file = await client.downloadCube({
      language: ctx.config.language,
      cubeCode: parsed.data.cubeCode,
      area: parsed.data.area,
      includeValues: parsed.data.includeValues,
      includeMetadata: parsed.data.includeMetadata,
      includeAdditionalMetadata: parsed.data.includeAdditionalMetadata,
      contents: parsed.data.contents,
      startYear: parsed.data.startYear,
      endYear: parsed.data.endYear,
      timeSlices: parsed.data.timeSlices,
      regionalSelection: parsed.data.regionalSelection,
      classifyingSelections: parsed.data.classifyingSelections,
      updatedAfter: parsed.data.updatedAfter
    });

    return {
      output: {
        cubeCode: parsed.data.cubeCode,
        format: 'csv' as const,
        fileName: file.fileName,
        mimeType: file.mimeType,
        byteLength: file.byteLength,
        isArchive: false as const
      },
      attachments: [createBase64Attachment(file.contentBase64, file.mimeType)],
      message: `Downloaded cube **${parsed.data.cubeCode}** as **${file.fileName}**.`
    };
  })
  .build();
