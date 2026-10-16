import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getWaiverForms = SlateTool.create(spec, {
  name: 'Get Waiver Forms',
  key: 'get_waiver_forms',
  description: `Retrieve waiver form definitions from your WaiverFile account. Returns form details including agreement text, field configuration, participant fields, signing options, and form settings. Can fetch only active forms or all forms including deleted ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeInactive: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Whether to include all forms, including deleted forms. Defaults to only active forms.'
        )
    })
  )
  .output(
    z.object({
      forms: z.any().describe('Complete waiver form response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let forms = ctx.input.includeInactive
      ? await client.getAllWaiverForms()
      : await client.getActiveWaiverForms();

    return {
      output: { forms },
      message: 'Retrieved the waiver form response.'
    };
  })
  .build();
