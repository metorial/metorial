import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateFormAnswer = SlateTool.create(spec, {
  name: 'Update Form Answer',
  key: 'update_form_answer',
  description: `Update an individual question value in an existing form submission. Targets a specific question within a submission by form name, response code, and question name. Supports updating questions inside repeatable subforms via the subform index.`,
  instructions: [
    'The form code uniquely identifies the submission to update.',
    'Use subformIndex when targeting a question inside a repeatable subform section.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formName: z.string().describe('Name of the form'),
      formCode: z.string().describe('Unique response code of the form submission'),
      questionName: z.string().describe('Name of the question to update'),
      questionValue: z.string().describe('New value for the question'),
      subformIndex: z
        .number()
        .optional()
        .describe('Index within a repeatable subform (0-based)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      response: z.any().optional().describe('Response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.changeFormAnswer({
      formName: ctx.input.formName,
      formCode: ctx.input.formCode,
      questionName: ctx.input.questionName,
      questionValue: ctx.input.questionValue,
      subformIndex: ctx.input.subformIndex
    });

    return {
      output: {
        success: true,
        response: result
      },
      message: `Updated question **"${ctx.input.questionName}"** in submission **${ctx.input.formCode}** to **"${ctx.input.questionValue}"**.`
    };
  })
  .build();
