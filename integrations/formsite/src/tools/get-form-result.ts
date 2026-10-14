import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { formDirSchema, resultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getFormResult = SlateTool.create(spec, {
  name: 'Get Form Result',
  key: 'get_form_result',
  description:
    'Retrieve one submission by its result ID, including metadata, text answers, and selected choices. Call list_forms to discover the form directory and get_form_results to find submission IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      formDir: formDirSchema,
      resultId: z.string().describe('Result ID returned by get_form_results'),
      resultsView: z
        .string()
        .optional()
        .describe('Results View ID to control which columns are returned')
    })
  )
  .output(z.object({ result: resultSchema }))
  .handleInvocation(async ctx => {
    let client = new FormsiteClient({
      token: ctx.auth.token,
      server: ctx.config.server,
      userDir: ctx.config.userDir
    });
    let result = await client.getFormResult(
      ctx.input.formDir,
      ctx.input.resultId,
      ctx.input.resultsView
    );
    return {
      output: { result },
      message: `Retrieved result ${result.resultId} for form ${ctx.input.formDir}.`
    };
  })
  .build();
