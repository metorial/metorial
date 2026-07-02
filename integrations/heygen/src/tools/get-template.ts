import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve details of a specific template including its dynamic variable definitions. Use this to understand what variables need to be provided when generating a video from a template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID'),
      name: z.string().describe('Template name'),
      variables: z
        .record(z.string(), z.any())
        .describe('Dynamic variable definitions and their types/defaults')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.getTemplate(ctx.input.templateId);

    let variableCount = Object.keys(result.variables).length;

    return {
      output: result,
      message: `Template **${result.name}** has **${variableCount}** dynamic variable(s).`
    };
  })
  .build();
