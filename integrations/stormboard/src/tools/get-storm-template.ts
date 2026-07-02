import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let getStormTemplate = SlateTool.create(spec, {
  name: 'Get Storm Template',
  key: 'get_storm_template',
  description: `Retrieve the template structure of a Storm, including all sections and subsections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm')
    })
  )
  .output(
    z.object({
      template: z.any().describe('Template data including sections and subsections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let template = await client.getStormTemplate(ctx.input.stormId);

    return {
      output: {
        template
      },
      message: `Retrieved template for Storm ${ctx.input.stormId}.`
    };
  })
  .build();
