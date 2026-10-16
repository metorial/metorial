import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let deleteQrCode = SlateTool.create(spec, {
  name: 'Delete QR Code',
  key: 'delete_qr_code',
  description: `Permanently delete a QR code from your Uniqode account. This action cannot be undone. Deleting a dynamic code affects its managed destination; content encoded directly in a static code is unaffected.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      qrCodeId: z.number().describe('ID of the QR code to delete')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      deleted: z.boolean().describe('Whether the deletion was successful'),
      qrCodeId: z.number().describe('ID of the deleted QR code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.deleteQrCode(ctx.input.qrCodeId);

    return {
      output: {
        raw: result,
        deleted: true,
        qrCodeId: ctx.input.qrCodeId
      },
      message: `Deleted QR code with ID **${ctx.input.qrCodeId}**.`
    };
  })
  .build();
