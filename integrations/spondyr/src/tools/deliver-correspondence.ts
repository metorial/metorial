import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let deliverCorrespondence = SlateTool.create(spec, {
  name: 'Deliver Correspondence',
  key: 'deliver_correspondence',
  description: `Trigger delivery of a previously generated correspondence that was created with the **generateOnly** flag set to \`true\`. Spondyr will deliver the content using the best available delivery method for each recipient (email, fax, postal mail, SMS, or batch download).`,
  instructions: [
    'This tool is only needed for correspondence that was created with generateOnly set to true.',
    'Use the Get Correspondence Status tool to verify the correspondence exists before attempting delivery.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referenceId: z.string().describe('The reference ID of the correspondence to deliver')
    })
  )
  .output(
    z.object({
      apiStatus: z.string().describe('API response status'),
      referenceId: z.string().describe('Reference ID of the delivered correspondence')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient({
      token: ctx.auth.token,
      applicationToken: ctx.auth.applicationToken
    });

    let result = await client.deliverCorrespondence({
      referenceId: ctx.input.referenceId
    });

    return {
      output: {
        apiStatus: result.apiStatus,
        referenceId: result.referenceId
      },
      message: `Delivery initiated for correspondence **${result.referenceId}**. Status: **${result.apiStatus}**.`
    };
  })
  .build();
