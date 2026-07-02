import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

let fileResultSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  fileName: z.string().optional().describe('Original file name'),
  fileUrl: z.string().optional().describe('URL to access the file'),
  isModerated: z.boolean().describe('Whether the file has been manually reviewed'),
  approvalStatus: z.string().optional().describe('Approval status'),
  exportStatus: z.string().optional().describe('Export status'),
  assignedMember: z.string().optional().describe('Email of the assigned reviewer'),
  predictionCount: z.number().describe('Number of extracted predictions')
});

export let listProcessedFiles = SlateTool.create(spec, {
  name: 'List Processed Files',
  key: 'list_processed_files',
  description: `List all files that have been processed by a Nanonets model within a date range. Returns both moderated (reviewed) and unmoderated files with their extraction results and review status.`,
  instructions: [
    'The date range uses "days since epoch" (January 1, 1970). For example, day 19700 corresponds to roughly December 2023.',
    "To calculate: Math.floor(Date.now() / 86400000) gives today's day since epoch."
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model to list files for'),
      startDayInterval: z
        .number()
        .describe('Start of date range as days since epoch (Jan 1, 1970)'),
      currentBatchDay: z
        .number()
        .describe('End of date range as days since epoch (Jan 1, 1970)')
    })
  )
  .output(
    z.object({
      moderatedCount: z.number().describe('Number of reviewed files'),
      unmoderatedCount: z.number().describe('Number of unreviewed files'),
      files: z.array(fileResultSchema).describe('List of processed files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.getAllPredictions(
      ctx.input.modelId,
      ctx.input.startDayInterval,
      ctx.input.currentBatchDay
    );

    let mapFile = (file: any) => ({
      fileId: file.id,
      fileName: file.original_file_name || file.input,
      fileUrl: file.file_url,
      isModerated: file.is_moderated ?? false,
      approvalStatus: file.approval_status,
      exportStatus: file.export_status,
      assignedMember: file.assigned_member,
      predictionCount: (file.predicted_boxes || []).length
    });

    let moderatedFiles = (result.moderated_images || []).map(mapFile);
    let unmoderatedFiles = (result.unmoderated_images || []).map(mapFile);
    let files = [...moderatedFiles, ...unmoderatedFiles];

    return {
      output: {
        moderatedCount: result.moderated_images_count ?? moderatedFiles.length,
        unmoderatedCount: result.unmoderated_images_count ?? unmoderatedFiles.length,
        files
      },
      message: `Found **${moderatedFiles.length}** reviewed and **${unmoderatedFiles.length}** unreviewed files for model \`${ctx.input.modelId}\`.`
    };
  })
  .build();
