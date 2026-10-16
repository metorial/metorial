import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import type { exportSchema } from '../lib/responses';
import { spec } from '../spec';

let exportMetadataSchema = z.object({
  exportId: z.string().describe('Provider export identifier.'),
  state: z.string().describe('Provider export lifecycle state.'),
  format: z.string().describe('Provider export format.'),
  transcriptionIds: z
    .array(z.string())
    .optional()
    .describe('Source IDs returned by Happy Scribe.')
});

let exportMetadata = (result: z.output<typeof exportSchema>) => ({
  exportId: result.id,
  state: result.state,
  format: result.format,
  transcriptionIds: result.transcription_ids
});

export let createExport = SlateTool.create(spec, {
  key: 'create_export',
  name: 'Create Export',
  description:
    'Start a document, subtitle, editing-project, spreadsheet or source-media export and return its status immediately. Use get_export to check progress. Use download_export for downloads from the documented media host; other download hosts require downloading in Happy Scribe.',
  instructions: [
    'Creating an export is a separate operation from downloading it. Do not create another export just because delivery failed.',
    'MP3 and MP4 exports require exactly one transcription. MP4 requires a video transcription.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      transcriptionIds: z.array(z.string()).min(1).describe('Transcriptions to export.'),
      format: z.enum([
        'txt',
        'docx',
        'pdf',
        'srt',
        'vtt',
        'stl',
        'avid',
        'avid_script',
        'avid_ds_subtitles',
        'avid_edl',
        'facebook_srt',
        'html',
        'premiere',
        'maxqda',
        'json',
        'fcp',
        'edl',
        'csv',
        'xlsx',
        'mp3',
        'mp4'
      ]),
      showTimestamps: z
        .boolean()
        .optional()
        .describe('Include timestamps in TXT, DOCX or PDF.'),
      timestampsFrequency: z
        .union([
          z.literal(5),
          z.literal(10),
          z.literal(15),
          z.literal(20),
          z.literal(30),
          z.literal(60)
        ])
        .optional()
        .describe('Inline timestamp interval in seconds.'),
      showSpeakers: z
        .boolean()
        .optional()
        .describe('Include speaker labels in TXT, DOCX or PDF.'),
      showComments: z.boolean().optional().describe('Include comments in TXT, DOCX or PDF.'),
      showHighlights: z.boolean().optional().describe('Include highlights in DOCX or PDF.'),
      showHighlightsOnly: z
        .boolean()
        .optional()
        .describe('Export only highlights in DOCX or PDF.')
    })
  )
  .output(exportMetadataSchema)
  .handleInvocation(async ctx => {
    if (['mp3', 'mp4'].includes(ctx.input.format) && ctx.input.transcriptionIds.length !== 1) {
      throw createApiServiceError('MP3 and MP4 exports require exactly one transcription ID.');
    }
    let client = new Client(ctx.auth);
    let result = await client.createExport(ctx.input);
    return {
      output: exportMetadata(result),
      message: `Export **${result.id}** was created in state **${result.state}**. Check it with get_export before downloading.`
    };
  })
  .build();

export let getExport = SlateTool.create(spec, {
  key: 'get_export',
  name: 'Get Export',
  description:
    'Check a previously created export without creating another export or downloading file content.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      exportId: z.string().describe('ID returned by create_export or export_transcription.')
    })
  )
  .output(exportMetadataSchema)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getExport(ctx.input.exportId);
    return {
      output: exportMetadata(result),
      message: `Export **${result.id}** is **${result.state}**.`
    };
  })
  .build();

export let downloadExport = SlateTool.create(spec, {
  key: 'download_export',
  name: 'Download Export',
  description:
    'Download a ready MP3, MP4, PDF, UTF-8 TXT, SRT, Facebook SRT, WebVTT or transcript JSON export served by the documented media.happyscribe.com host. Other hosts, formats and invalid bodies fail explicitly; download those in Happy Scribe. This does not recreate expired exports.',
  tags: { readOnly: true }
})
  .input(z.object({ exportId: z.string().describe('ID of a ready export.') }))
  .output(
    exportMetadataSchema.extend({
      filename: z.string(),
      mimeType: z.string(),
      byteLength: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getExport(ctx.input.exportId);
    if (result.state !== 'ready' || !result.download_link) {
      throw createApiServiceError(
        `Export ${result.id} is ${result.state} and has no ready download. Check get_export; explicitly create a new export if it expired.`
      );
    }
    let file = await client.downloadFile(result.download_link, result.format);
    let filename = `export-${result.id}.${file.extension}`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(file.bytes, { headers: { 'Content-Type': file.mimeType } }),
      filename,
      mimeType: file.mimeType
    });
    return {
      output: {
        ...exportMetadata(result),
        filename,
        mimeType: file.mimeType,
        byteLength: file.bytes.length
      },
      message: `Prepared export **${result.id}** for download.`
    };
  })
  .build();
