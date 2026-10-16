import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, inputId } from '../lib/client';
import { mapTemplate, templateOutput } from '../lib/schemas';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description:
    'Read a saved postcard template by ID, including its content, font, motive, and preview link when available.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ templateId: z.string().describe('Template ID from List Templates') }))
  .output(templateOutput)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).get(
      `/templates/${inputId(ctx.input.templateId, 'templateId')}`
    );
    return { output: mapTemplate(result), message: 'Retrieved postcard template.' };
  })
  .build();
