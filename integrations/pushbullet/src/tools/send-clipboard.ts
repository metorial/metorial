import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendClipboard = SlateTool.create(spec, {
  name: 'Send Clipboard',
  key: 'send_clipboard',
  description: `Copy text to the clipboard on all connected devices using Pushbullet's universal copy/paste feature. The text is delivered in real time as an ephemeral message.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text content to copy to all device clipboards'),
      sourceDeviceIden: z
        .string()
        .optional()
        .describe('Identifier of the device sending the clipboard content')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the clipboard was sent successfully'),
      text: z.string().describe('The text that was sent to clipboards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendClipboard(ctx.input.text, ctx.input.sourceDeviceIden);

    let preview =
      ctx.input.text.length > 50 ? `${ctx.input.text.substring(0, 50)}...` : ctx.input.text;

    return {
      output: {
        success: true,
        text: ctx.input.text
      },
      message: `Clipboard content sent to all devices: "${preview}"`
    };
  })
  .build();
