import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createQuestion = SlateTool.create(spec, {
  name: 'Create Question',
  key: 'create_question',
  description: `Create a new data collection question in CodeREADr. Questions can be attached to services and presented to app users during scanning. Supports various input types.`
})
  .input(
    z.object({
      text: z.string().describe('The question text to display to the user'),
      type: z
        .enum([
          'manual',
          'manualnumeric',
          'option',
          'checkbox',
          'dropdown',
          'gps',
          'dropboximage',
          'webcollect'
        ])
        .optional()
        .describe('Question input type. Defaults to "manual" (keyboard text entry).')
    })
  )
  .output(
    z.object({
      questionId: z.string().describe('ID of the newly created question')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let questionId = await client.createQuestion(ctx.input.text, ctx.input.type);

    return {
      output: { questionId },
      message: `Created question **${ctx.input.text}** (ID: ${questionId}, type: ${ctx.input.type || 'manual'}).`
    };
  })
  .build();
