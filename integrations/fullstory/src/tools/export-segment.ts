import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportSegment = SlateTool.create(spec, {
  name: 'Export Segment',
  key: 'export_segment',
  description: `Start an export of segment data from FullStory. Exports can include individual user data or event data in CSV, JSON, or NDJSON format. Returns an operation ID that can be used to track the export progress.`,
  instructions: [
    'Use the Get Operation Status tool to check when the export is complete.',
    'Use "everyone" as the segmentId to export all users.'
  ],
  constraints: [
    'Requires an Admin or Architect API key.',
    'This is an Enterprise/Advanced tier feature.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      segmentId: z
        .string()
        .describe('ID of the segment to export, or "everyone" for all users'),
      exportType: z
        .enum(['TYPE_EVENT', 'TYPE_INDIVIDUAL'])
        .describe('Type of data to export: events or individual users'),
      format: z
        .enum(['FORMAT_CSV', 'FORMAT_JSON', 'FORMAT_NDJSON'])
        .describe('Output format for the export'),
      startTime: z
        .string()
        .optional()
        .describe('Start of the time range (ISO 8601, inclusive)'),
      endTime: z.string().optional().describe('End of the time range (ISO 8601, exclusive)'),
      segmentStartTime: z
        .string()
        .optional()
        .describe("Override the segment's built-in time range start (ISO 8601)"),
      segmentEndTime: z
        .string()
        .optional()
        .describe("Override the segment's built-in time range end (ISO 8601)")
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID for tracking the async export')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSegmentExport({
      segmentId: ctx.input.segmentId,
      type: ctx.input.exportType,
      format: ctx.input.format,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      segmentStartTime: ctx.input.segmentStartTime,
      segmentEndTime: ctx.input.segmentEndTime
    });

    return {
      output: {
        operationId: result.operationId
      },
      message: `Segment export started. Operation ID: \`${result.operationId}\`. Use Get Operation Status to check progress.`
    };
  })
  .build();
