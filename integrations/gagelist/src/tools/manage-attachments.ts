import { SlateTool } from 'slates';
import { z } from 'zod';
import { BASE_URL, Client } from '../lib/client';
import { spec } from '../spec';

export let getAttachment = SlateTool.create(spec, {
  key: 'get_attachment',
  name: 'Get Attachment',
  description:
    'Download a file from a gage or calibration record. Call get_gage or get_calibration to discover the file ID in the record attachments.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      attachmentId: z
        .number()
        .int()
        .positive()
        .describe('File ID from get_gage or get_calibration')
    })
  )
  .output(z.object({ attachmentId: z.number().describe('ID of the requested file') }))
  .handleInvocation(async ctx => {
    await ctx.addAttachment({
      type: 'url',
      url: `${BASE_URL}/Attachment/Download/${ctx.input.attachmentId}`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: { attachmentId: ctx.input.attachmentId },
      message: `Prepared file **${ctx.input.attachmentId}** for download.`
    };
  })
  .build();

export let deleteAttachment = SlateTool.create(spec, {
  key: 'delete_attachment',
  name: 'Delete Attachment',
  description:
    'Delete a file from a gage or calibration record using its file ID. Call get_gage or get_calibration to discover file IDs.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      attachmentId: z
        .number()
        .int()
        .positive()
        .describe('File ID from get_gage or get_calibration')
    })
  )
  .output(z.object({ attachmentId: z.number().describe('ID of the file sent for deletion') }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteAttachment(ctx.input.attachmentId);
    return {
      output: { attachmentId: ctx.input.attachmentId },
      message: `Completed the delete request for file **${ctx.input.attachmentId}**.`
    };
  })
  .build();
