import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve the full details of a specific template including its question definitions, logic flow, and intro/outro messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateUuid: z.string().describe('UUID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateUuid: z.string().describe('UUID of the template'),
      name: z.string().describe('Name of the template'),
      questions: z.array(z.any()).optional().describe('Question definitions in the template'),
      raw: z.any().describe('Full template object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let template = await client.getTemplate(ctx.input.templateUuid);

    return {
      output: {
        templateUuid: template.uuid,
        name: template.name,
        questions: template.questions ?? template.fields,
        raw: template
      },
      message: `Retrieved template **${template.name}**.`
    };
  })
  .build();
