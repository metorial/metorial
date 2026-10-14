import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCallerPicture = SlateTool.create(spec, {
  name: 'Get Caller Picture',
  key: 'get_caller_picture',
  description: `Retrieve the profile picture associated with a phone number as a downloadable image. Also returns the original base64-encoded image for display.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +18006927753)',
    'Not all phone numbers will have an associated picture'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +18006927753)')
    })
  )
  .output(
    z.object({
      pictureBase64: z.string().optional().describe('Base64-encoded profile picture image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPhonePicture(ctx.input.phoneNumber);

    let pictureBase64 =
      typeof result === 'string' ? result : result?.picture || result?.image || result?.data;

    if (typeof pictureBase64 === 'string' && pictureBase64) {
      let dataUrl = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(pictureBase64);
      let encoded = (dataUrl?.[2] ?? pictureBase64).replace(/\s/g, '');
      if (/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
        let bytes = Buffer.from(encoded, 'base64');
        let mimeType =
          dataUrl?.[1] ??
          (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? 'image/png'
            : bytes[0] === 255 && bytes[1] === 216
              ? 'image/jpeg'
              : bytes.subarray(0, 3).toString() === 'GIF'
                ? 'image/gif'
                : bytes.subarray(0, 4).toString() === 'RIFF' &&
                    bytes.subarray(8, 12).toString() === 'WEBP'
                  ? 'image/webp'
                  : 'application/octet-stream');
        await ctx.addAttachment({
          type: 'content',
          content: new Response(bytes, { headers: { 'Content-Type': mimeType } }),
          mimeType,
          filename: 'caller-picture'
        });
      }
    }

    return {
      output: {
        pictureBase64: pictureBase64
      },
      message: pictureBase64
        ? `Retrieved profile picture for **${ctx.input.phoneNumber}**.`
        : `No profile picture found for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
