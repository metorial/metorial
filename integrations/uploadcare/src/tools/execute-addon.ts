import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executeAddon = SlateTool.create(spec, {
  name: 'Execute Add-On',
  key: 'execute_addon',
  description: `Run an Uploadcare add-on on a file. Available add-ons:
- **AWS Rekognition Detect Labels** — detect objects and scenes in images
- **AWS Rekognition Moderation** — detect unsafe or inappropriate image content
- **ClamAV Virus Scan** — scan a file for malware
- **Remove.bg** — remove background from an image

Execution is asynchronous. Returns a request ID for polling the add-on status.`
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the target file'),
      addon: z
        .enum([
          'aws_rekognition_detect_labels',
          'aws_rekognition_detect_moderation_labels',
          'uc_clamav_virus_scan',
          'remove_bg'
        ])
        .describe('Add-on to execute'),
      purgeInfected: z
        .boolean()
        .optional()
        .describe('Automatically remove infected files (ClamAV only)'),
      removeBgParams: z
        .object({
          crop: z.boolean().optional().describe('Crop the result to the foreground object'),
          cropMargin: z
            .string()
            .optional()
            .describe('Margin around the cropped area (e.g. "30px" or "10%")'),
          scale: z.string().optional().describe('Scale the result (e.g. "50%")'),
          addShadow: z.boolean().optional().describe('Add a shadow to the foreground object'),
          type: z
            .enum(['auto', 'person', 'product', 'car'])
            .optional()
            .describe('Foreground type hint'),
          semitransparency: z
            .boolean()
            .optional()
            .describe('Whether to keep semi-transparent regions'),
          channels: z.enum(['rgba', 'alpha']).optional().describe('Output image channels')
        })
        .optional()
        .describe('Parameters specific to the Remove.bg add-on')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request ID for polling add-on execution status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let params: Record<string, any> | undefined;

    if (ctx.input.addon === 'uc_clamav_virus_scan' && ctx.input.purgeInfected !== undefined) {
      params = { purge_infected: ctx.input.purgeInfected };
    }

    if (ctx.input.addon === 'remove_bg' && ctx.input.removeBgParams) {
      let p = ctx.input.removeBgParams;
      params = {};
      if (p.crop !== undefined) params.crop = p.crop;
      if (p.cropMargin !== undefined) params.crop_margin = p.cropMargin;
      if (p.scale !== undefined) params.scale = p.scale;
      if (p.addShadow !== undefined) params.add_shadow = p.addShadow;
      if (p.type !== undefined) params.type = p.type;
      if (p.semitransparency !== undefined) params.semitransparency = p.semitransparency;
      if (p.channels !== undefined) params.channels = p.channels;
    }

    let requestId = await client.executeAddon(ctx.input.addon, ctx.input.fileId, params);

    return {
      output: { requestId },
      message: `Add-on **${ctx.input.addon}** execution started on file ${ctx.input.fileId}. Request ID: \`${requestId}\`.`
    };
  })
  .build();

export let getAddonStatus = SlateTool.create(spec, {
  name: 'Get Add-On Status',
  key: 'get_addon_status',
  description: `Check the status of an asynchronous add-on execution. For completed executions, results are stored in the file's appdata field — use the Get File tool with includeAppdata to view them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addon: z
        .enum([
          'aws_rekognition_detect_labels',
          'aws_rekognition_detect_moderation_labels',
          'uc_clamav_virus_scan',
          'remove_bg'
        ])
        .describe('Add-on that was executed'),
      requestId: z.string().describe('Request ID from the execute add-on response')
    })
  )
  .output(
    z.object({
      status: z
        .enum(['in_progress', 'done', 'error', 'unknown'])
        .describe('Current execution status'),
      resultFileId: z
        .string()
        .optional()
        .describe('UUID of the result file (for remove_bg when done)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let statusResult = await client.getAddonStatus(ctx.input.addon, ctx.input.requestId);

    return {
      output: {
        status: statusResult.status as any,
        resultFileId: statusResult.result?.file_id
      },
      message: `Add-on **${ctx.input.addon}** status: **${statusResult.status}**.${statusResult.result?.file_id ? ` Result file: ${statusResult.result.file_id}` : ''}`
    };
  })
  .build();
