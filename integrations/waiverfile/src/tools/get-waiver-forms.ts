import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getWaiverForms = SlateTool.create(spec, {
  name: 'Get Waiver Forms',
  key: 'get_waiver_forms',
  description: `Retrieve waiver form definitions from your WaiverFile account. Returns form details including agreement text, field configuration, participant fields, signing options, and form settings. Can fetch only active forms or all forms including inactive ones.`,
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
        .describe('Whether to include inactive forms. Defaults to only active forms.')
    })
  )
  .output(
    z.object({
      forms: z.any().describe('Array of waiver form definitions')
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

    let results = Array.isArray(forms) ? forms : [forms];

    return {
      output: { forms: results },
      message: `Retrieved **${results.length}** waiver form(s)${ctx.input.includeInactive ? ' (including inactive)' : ''}.`
    };
  })
  .build();
