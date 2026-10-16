import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  optionalString,
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseRecord,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

export let generateAiContent = SlateTool.create(spec, {
  name: 'Generate AI Content',
  key: 'generate_ai_content',
  description: `Generate text content using Planly's AI. Provide a prompt and specify how many variations to generate. AI usage is credit-based; use "Get AI Credits" to check available credits before generating. Call list_teams to discover the team ID.`,
  constraints: [
    'AI content generation consumes credits. Check available credits with the "Get AI Credits" tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      prompt: z.string().describe('Text prompt for AI content generation'),
      variations: z.number().describe('Number of content variations to generate')
    })
  )
  .output(
    z.object({
      completionId: z.string().optional().describe('AI completion request ID'),
      choices: z
        .array(
          z.object({
            text: z.string().describe('Generated text content')
          })
        )
        .describe('Generated content variations'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    if (!Number.isInteger(ctx.input.variations) || ctx.input.variations <= 0) {
      throw createApiServiceError('variations must be a positive whole number.');
    }
    if (!ctx.input.prompt.trim())
      throw createApiServiceError('A nonempty prompt is required.');
    let client = new Client({ token: ctx.auth.token });
    let data = responseRecord(
      responseData(
        await client.aiComplete(ctx.input.teamId, ctx.input.prompt, ctx.input.variations)
      ),
      'AI completion'
    );
    let choices = responseArray(data.choices, 'AI choices').map(value => {
      let choice = responseRecord(value, 'AI choice');
      return { text: requiredString(choice.text, 'generated text') };
    });
    return {
      output: { completionId: optionalString(data.id), choices, raw: data },
      message: `Generated ${choices.length} content variation(s).`
    };
  });
