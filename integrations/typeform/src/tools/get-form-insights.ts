import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let getFormInsights = SlateTool.create(spec, {
  name: 'Get Form Insights',
  key: 'get_form_insights',
  description: `Retrieve analytics and insights for a typeform, including response counts, completion rates, and question-level metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to retrieve insights for')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form ID'),
      insights: z
        .any()
        .describe(
          'Form insights data including response counts, completion rates, and per-question metrics'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getFormInsights(ctx.input.formId);

    return {
      output: {
        formId: ctx.input.formId,
        insights: result
      },
      message: `Retrieved insights for form \`${ctx.input.formId}\`.`
    };
  })
  .build();
