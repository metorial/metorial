import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let generateFromTemplate = SlateTool.create(spec, {
  name: 'Generate Video from Template',
  key: 'generate_from_template',
  description: `Generate a customized video from a HeyGen template by filling in dynamic variables. Templates are pre-designed in HeyGen's web interface and contain placeholders (e.g. \`{{name}}\`, \`{{company}}\`) that you populate via the API. Ideal for personalized videos at scale.`,
  instructions: [
    'Use "list_templates" first to find available template IDs.',
    'Use "get_template" to see which variables a template requires.',
    'Variable names use double curly braces in the template (e.g. {{name}}) — pass them without braces as keys in the variables object.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to generate from'),
      variables: z
        .record(z.string(), z.any())
        .describe('Key-value map of template variable names to their values'),
      title: z.string().optional().describe('Title for the generated video'),
      test: z
        .boolean()
        .optional()
        .describe('If true, generates a free watermarked test video'),
      callbackId: z
        .string()
        .optional()
        .describe('Custom callback ID for webhook notifications')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Generated video ID for status polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.generateFromTemplate({
      templateId: ctx.input.templateId,
      variables: ctx.input.variables,
      title: ctx.input.title,
      test: ctx.input.test,
      callbackId: ctx.input.callbackId
    });

    return {
      output: result,
      message: `Video generation from template **${ctx.input.templateId}** started. Video ID: **${result.videoId}**. Use "Get Video Status" to check progress.`
    };
  })
  .build();
