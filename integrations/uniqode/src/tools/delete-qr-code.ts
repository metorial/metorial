import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let deleteQrCode = SlateTool.create(spec, {
  name: 'Delete QR Code',
  key: 'delete_qr_code',
  description: `Permanently delete a QR code from your Beaconstac account. This action cannot be undone. The QR code will no longer be scannable after deletion.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful'),
      qrCodeId: z.number().describe('ID of the deleted QR code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteQrCode(ctx.input.qrCodeId);

    return {
      output: {
        deleted: true,
        qrCodeId: ctx.input.qrCodeId
      },
      message: `Deleted QR code with ID **${ctx.input.qrCodeId}**.`
    };
  })
  .build();
