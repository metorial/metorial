import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractIdData = SlateTool.create(spec, {
  name: 'Extract ID Data',
  key: 'extract_id_data',
  description: `Extract structured JSON data from identity card images. Upload a base64-encoded image of an ID card (passport, driver's license, national ID, etc.) and receive parsed fields such as names, dates, ID numbers, and other relevant information.

Ideal for KYC (Know Your Customer) processes and automated identity verification workflows.`,
  instructions: [
    'Provide the image as a base64-encoded string without the data URI prefix.',
    'Specify the file format of the image (e.g., "png", "jpg", "jpeg").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileFormat: z.string().describe('Image file format, e.g. "png", "jpg", "jpeg"'),
      base64String: z.string().describe('Base64-encoded image of the identity card')
    })
  )
  .output(
    z.object({
      extractedData: z
        .any()
        .describe(
          'Structured data extracted from the identity card including names, dates, ID numbers, etc.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Extracting ID data from image...');

    let result = await client.extractIdData({
      fileFormat: ctx.input.fileFormat,
      base64String: ctx.input.base64String
    });

    return {
      output: {
        extractedData: result
      },
      message: `Successfully extracted identity data from the provided ID card image.`
    };
  })
  .build();
