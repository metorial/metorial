import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportTranscription = SlateTool.create(spec, {
  name: 'Export Transcription',
  key: 'export_transcription',
  description: `Export one or more transcriptions to a specific format. Supports text (txt, docx, pdf), subtitle (srt, vtt, stl), professional editing (avid, premiere, fcp), and other formats (html, maxqda, json). The export is processed asynchronously; this tool creates the export and polls until it's ready, returning the download link.`,
  instructions: [
    'Timestamps, speakers, comments, and highlights options only apply to certain formats (txt, docx, pdf).',
    'Export processing typically takes about 10 seconds per file.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptionIds: z.array(z.string()).describe('IDs of the transcriptions to export.'),
      format: z
        .enum([
          'txt',
          'docx',
          'pdf',
          'srt',
          'vtt',
          'stl',
          'avid',
          'html',
          'premiere',
          'maxqda',
          'json',
          'fcp'
        ])
        .describe('Export format.'),
      showTimestamps: z
        .boolean()
        .optional()
        .describe('Include timestamps in the export (txt, docx, pdf only).'),
      timestampsFrequency: z
        .number()
        .optional()
        .describe(
          'Frequency of inline timestamps in seconds (5-60). Requires showTimestamps to be true.'
        ),
      showSpeakers: z
        .boolean()
        .optional()
        .describe('Include speaker labels in the export (txt, docx, pdf only).'),
      showComments: z
        .boolean()
        .optional()
        .describe('Include comments in the export (txt, docx, pdf only).'),
      showHighlights: z
        .boolean()
        .optional()
        .describe('Include highlights in the export (docx, pdf only).'),
      showHighlightsOnly: z
        .boolean()
        .optional()
        .describe('Export only highlighted portions (docx, pdf only).')
    })
  )
  .output(
    z.object({
      exportId: z.string().describe('ID of the export.'),
      state: z.string().describe('Final state of the export.'),
      format: z.string().describe('Format of the export.'),
      downloadUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL to download the exported file (available when state is "ready").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let exportResult = await client.createExport({
      format: ctx.input.format,
      transcriptionIds: ctx.input.transcriptionIds,
      showTimestamps: ctx.input.showTimestamps,
      timestampsFrequency: ctx.input.timestampsFrequency,
      showSpeakers: ctx.input.showSpeakers,
      showComments: ctx.input.showComments,
      showHighlights: ctx.input.showHighlights,
      showHighlightsOnly: ctx.input.showHighlightsOnly
    });

    let maxAttempts = 30;
    let attempt = 0;
    let currentExport = exportResult;

    while (
      (currentExport.state === 'pending' || currentExport.state === 'processing') &&
      attempt < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      currentExport = await client.getExport(currentExport.id);
      attempt++;
      ctx.progress(`Export is ${currentExport.state}... (attempt ${attempt}/${maxAttempts})`);
    }

    return {
      output: {
        exportId: currentExport.id,
        state: currentExport.state,
        format: currentExport.format,
        downloadUrl: currentExport.download_link || null
      },
      message:
        currentExport.state === 'ready'
          ? `Export **${currentExport.id}** is ready. [Download](${currentExport.download_link})`
          : `Export **${currentExport.id}** is in state **${currentExport.state}**. It may still be processing.`
    };
  })
  .build();
