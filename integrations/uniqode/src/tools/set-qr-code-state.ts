import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let setQrCodeState = SlateTool.create(spec, {
  key: 'set_qr_code_state',
  name: 'Set QR Code State',
  description:
    'Activate or deactivate a dynamic QR code without deleting it. Applies only to dynamic QR codes.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ qrCodeId: z.number().int().positive(), active: z.boolean() }))
  .output(z.object({ raw: z.unknown().describe('Provider state-change response') }))
  .handleInvocation(async ctx => {
    let raw = await new BeaconstacClient(ctx.auth).setQrCodeState(
      ctx.input.qrCodeId,
      ctx.input.active
    );
    return { output: { raw }, message: 'Uniqode returned the QR code state-change response.' };
  })
  .build();
