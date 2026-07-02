import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let exportDatasetTool = SlateTool.create(spec, {
  name: 'Export Dataset',
  key: 'export_dataset',
  description: `Export a dataset version in a specified annotation format. Returns a download link for the exported dataset. Supported formats include YOLOv5, COCO JSON, Pascal VOC, TFRecord, and many more.`,
  instructions: [
    'Common formats: yolov5pytorch, yolov7pytorch, yolov8, coco, voc, tfrecord, darknet, createml.',
    'If the export is still being generated, the status will indicate it is in progress.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      versionNumber: z.number().describe('Version number to export'),
      format: z
        .string()
        .describe('Export format (e.g., "yolov5pytorch", "coco", "voc", "tfrecord")')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().optional().describe('URL to download the exported dataset'),
      format: z.string().describe('Export format'),
      status: z.string().describe('Export status ("ready" or "generating")')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.exportDataset(
      workspaceId,
      ctx.input.projectId,
      ctx.input.versionNumber,
      ctx.input.format
    );

    let exportData = result.export || {};
    let isReady = !!exportData.link;

    return {
      output: {
        downloadUrl: exportData.link,
        format: exportData.format || ctx.input.format,
        status: isReady ? 'ready' : 'generating'
      },
      message: isReady
        ? `Dataset export in **${ctx.input.format}** format is ready for download.`
        : `Dataset export in **${ctx.input.format}** format is being generated. Try again shortly.`
    };
  })
  .build();
