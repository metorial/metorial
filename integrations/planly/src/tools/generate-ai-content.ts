import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAiContent = SlateTool.create(spec, {
  name: 'Generate AI Content',
  key: 'generate_ai_content',
  description: `Generate text content using Planly's AI. Provide a prompt and specify how many variations to generate. AI usage is credit-based; use "Get AI Credits" to check available credits before generating.`,
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
      teamId: z.string().describe('ID of the team'),
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
        .describe('Generated content variations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.aiComplete(
      ctx.input.teamId,
      ctx.input.prompt,
      ctx.input.variations
    );
    let data = result.data || result;

    return {
      output: {
        completionId: data.id,
        choices: (data.choices || []).map((c: any) => ({ text: c.text }))
      },
      message: `Generated ${data.choices?.length || 0} content variation(s).`
    };
  });
