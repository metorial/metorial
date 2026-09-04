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

let formatSchema = z.enum(['csv', 'datencsv', 'ffcsv', 'html', 'genml', 'xlsx']);

let downloadTableInputSchema = z.object({
  tableCode: boundedTrimmedString(
    10,
    'Table code returned by search_catalog or get_metadata.'
  ),
  area: areaSchema,
  format: formatSchema
    .optional()
    .default('ffcsv')
    .describe('Presentation-table download format. CSV variants are delivered in ZIP files.'),
  compress: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, suppress empty rows and columns and change the table shape. This does not control ZIP packaging.'
    ),
  transpose: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to exchange the table rows and columns.'),
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
  classifyingSelections: classifyingSelectionsSchema(5),
  updatedAfter: updatedAfterSchema
});

let tableFileSchema = z.object({
  tableCode: z.string().describe('Downloaded GENESIS-Online table code.'),
  format: formatSchema.describe('Downloaded table format.'),
  fileName: z.string().describe('Provider file name or a safe generated fallback.'),
  mimeType: z.string().describe('MIME type of the downloadable file.'),
  byteLength: z.number().int().positive().describe('Downloaded file size in bytes.'),
  isArchive: z.boolean().describe('Whether the downloadable file is a ZIP archive.')
});

export let downloadTable = SlateTool.create(spec, {
  name: 'Download Table',
  key: 'download_table',
  description:
    'Download a filtered Destatis GENESIS-Online presentation table as one downloadable file with file metadata.',
  instructions: [
    'Use get_metadata to inspect table dimensions before applying filters.',
    'Use list_variable_values to discover valid regional and classifying value codes.'
  ],
  constraints: [
    'A Destatis example dated 24 March 2025 documented a 40,000-value direct-table threshold; the current API guide publishes no fixed threshold. If the provider rejects a large export, narrow years, time slices, contents, or variable selections.',
    'The downloaded response is limited to 64 MiB; narrow the requested table if necessary.',
    'ZIP-based CSV and XLSX files are limited to 32 MiB after expansion and 4,096 archive entries; an entry is rejected when its expanded size exceeds 200 times its compressed size plus 1 MiB.',
    'GENML/XML files are limited to 32 MiB; XML deeper than 64 elements or containing more than 100,000 elements is rejected.',
    'CSV, data CSV, and flat CSV table formats are packaged as ZIP files by the provider.',
    'English responses can contain provider metadata that has not been translated.',
    'Token-authenticated downloads cannot enqueue asynchronous jobs.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(downloadTableInputSchema)
  .output(tableFileSchema)
  .handleInvocation(async ctx => {
    let parsed = downloadTableInputSchema.safeParse(ctx.input);
    if (!parsed.success) {
      let detail = parsed.error.issues[0]?.message ?? 'Invalid table download input.';
      throw destatisValidationError(`Invalid table download input: ${detail}`);
    }
    validateYearOrder(parsed.data.startYear, parsed.data.endYear);

    let client = new GenesisClient({ token: ctx.auth.token });
    let file = await client.downloadTable({
      language: ctx.config.language,
      tableCode: parsed.data.tableCode,
      area: parsed.data.area,
      format: parsed.data.format,
      compress: parsed.data.compress,
      transpose: parsed.data.transpose,
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
        tableCode: parsed.data.tableCode,
        format: parsed.data.format,
        fileName: file.fileName,
        mimeType: file.mimeType,
        byteLength: file.byteLength,
        isArchive: file.isArchive
      },
      attachments: [createBase64Attachment(file.contentBase64, file.mimeType)],
      message: `Downloaded table **${parsed.data.tableCode}** as **${file.fileName}**.`
    };
  })
  .build();
