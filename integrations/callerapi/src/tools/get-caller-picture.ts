import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCallerPicture = SlateTool.create(spec, {
  name: 'Get Caller Picture',
  key: 'get_caller_picture',
  description: `Retrieve the profile picture associated with a phone number. Returns a base64-encoded image that can be used directly for display.`,
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
