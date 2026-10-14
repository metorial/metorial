import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description:
    'Retrieve a form definition, questions, and workflow configuration. Use list_forms to discover the form UUID. Reading responses remains subject to the form permissions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      formUuid: z.string().describe('Form UUID. Use list_forms to discover available forms.')
    })
  )
  .output(
    z.object({
      formUuid: z.string().describe('UUID of the form'),
      name: z.string().describe('Name of the form'),
      isActive: z.boolean().optional().describe('Whether the form is active'),
      isAnonymous: z
        .boolean()
        .optional()
        .describe('Whether responses are collected anonymously'),
      questions: z.array(z.any()).optional().describe('Question definitions'),
      workflow: z.any().optional().describe('Workflow configuration'),
      raw: z.any().describe('Full form object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let form = await new DailyBotClient({ token: ctx.auth.token }).getForm(ctx.input.formUuid);
    return {
      output: {
        formUuid: form.uuid,
        name: form.name,
        isActive: form.is_active,
        isAnonymous: form.collect_responses_anonymously ?? form.is_anonymous,
        questions: form.questions,
        workflow: form.workflow,
        raw: form
      },
      message: `Retrieved form **${form.name}**.`
    };
  })
  .build();
