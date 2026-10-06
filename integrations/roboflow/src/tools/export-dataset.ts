import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema, versionNumberSchema } from '../lib/schemas';
import { spec } from '../spec';

export let exportDatasetTool = SlateTool.create(spec, {
  name: 'Export Dataset',
  key: 'export_dataset',
  description: `Export a dataset version as a downloadable ZIP in a specified annotation format. Supported formats include YOLOv5, COCO JSON, Pascal VOC, TFRecord, and many more.`,
  instructions: [
    'Common formats: yolov5pytorch, yolov7pytorch, yolov8, coco, voc, tfrecord, darknet, createml.',
    'If the export is still being generated, the status will indicate it is in progress.'
  ]
})
  .input(
    z.object({
      projectId: projectIdSchema,
      versionNumber: versionNumberSchema,
      format: z
        .string()
        .describe('Export format (e.g., "yolov5pytorch", "coco", "voc", "tfrecord")')
    })
  )
  .output(
    z.object({
      downloadUrl: z.string().optional().describe('URL to download the exported dataset'),
      format: z.string().describe('Export format'),
      status: z.string().describe('Export status ("ready" or "generating")'),
      progress: z.number().optional().describe('Export progress reported by Roboflow')
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
    const progress = result.progress == null ? undefined : Number(result.progress);
    if (isReady) {
      await ctx.addAttachment({
        type: 'url',
        url: exportData.link,
        mimeType: 'application/zip'
      });
    }

    return {
      output: {
        format: exportData.format || ctx.input.format,
        status: isReady ? 'ready' : 'generating',
        progress: progress !== undefined && Number.isFinite(progress) ? progress : undefined
      },
      message: isReady
        ? `Dataset export in **${ctx.input.format}** format is ready for download.`
        : `Dataset export in **${ctx.input.format}** format is being generated. Try again shortly.`
    };
  })
  .build();
