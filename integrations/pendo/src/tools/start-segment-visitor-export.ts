import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let startSegmentVisitorExport = SlateTool.create(spec, {
  name: 'Start Segment Visitor Export',
  key: 'start_segment_visitor_export',
  description: `Start an asynchronous export of visitors in a Pendo segment. Use Get Segment Visitor Export with the returned job ID to check status and retrieve CSV results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('The segment ID to export visitors from')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Segment ID submitted for export'),
      jobId: z.string().optional().describe('Pendo export job ID'),
      raw: z.any().describe('Raw Pendo export job response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let result = await client.startSegmentVisitorExport(ctx.input.segmentId);

    return {
      output: {
        segmentId: ctx.input.segmentId,
        jobId: result.id || result.jobId,
        raw: result
      },
      message: `Started visitor export for Pendo segment **${ctx.input.segmentId}**.`
    };
  })
  .build();
