import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getWaiver = SlateTool.create(spec, {
  name: 'Get Waiver',
  key: 'get_waiver',
  description: `Retrieve a complete signed waiver record by its ID. Returns the full waiver data including signer details (name, email, address, phone, DOB), participant information, custom field values, signature status, opt-in preference, associated event/form data, and reference IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      waiverId: z.string().describe('The unique ID of the waiver to retrieve')
    })
  )
  .output(
    z.object({
      waiver: z
        .any()
        .describe('Complete waiver record with signer, participant, and form data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let waiver = await client.getWaiver(ctx.input.waiverId);

    return {
      output: { waiver },
      message: `Retrieved waiver **${ctx.input.waiverId}** successfully.`
    };
  })
  .build();
