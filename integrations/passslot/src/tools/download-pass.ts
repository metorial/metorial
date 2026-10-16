import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadPass = SlateTool.create(spec, {
  name: 'Download Pass',
  key: 'download_pass',
  description:
    'Download an existing Apple Wallet pass as a .pkpass file, including its signed description and images. Call list_passes to discover pass identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      passTypeIdentifier: z.string().describe('Pass type identifier from list_passes'),
      serialNumber: z.string().describe('Serial number from list_passes')
    })
  )
  .output(
    z.object({
      passTypeIdentifier: z.string(),
      serialNumber: z.string(),
      distributionUrl: z.string().describe('Shareable distribution link for the pass'),
      filename: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { passTypeIdentifier, serialNumber } = ctx.input;
    let result = await client.getPassUrl(passTypeIdentifier, serialNumber);
    let filename = `${encodeURIComponent(serialNumber)}.pkpass`;
    let mimeType = 'application/vnd.apple.pkpass';

    await ctx.addAttachment({
      type: 'url',
      url: client.getPassDownloadUrl(passTypeIdentifier, serialNumber),
      headers: { Authorization: ctx.auth.token },
      filename,
      mimeType
    });

    return {
      output: {
        passTypeIdentifier,
        serialNumber,
        distributionUrl: result.url,
        filename,
        mimeType
      },
      message: `Prepared pass **${serialNumber}** for download.`
    };
  })
  .build();
