import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let evaluateContent = SlateTool.create(spec, {
  name: 'Evaluate Content',
  key: 'evaluate_content',
  description: `Evaluate content against NeuronWriter's SEO scoring without saving it. Accepts the same inputs as Import Content (HTML or URL) and returns a content score. Useful for validating content before publishing or scoring externally generated content.`,
  instructions: [
    'Provide either html or sourceUrl, not both.',
    'The containerId and containerClass options only apply when evaluating from a URL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queryId: z.string().describe('Query ID to evaluate content against'),
      html: z.string().optional().describe('Raw HTML content to evaluate'),
      sourceUrl: z.string().optional().describe('URL to evaluate content from'),
      title: z.string().optional().describe('Content title'),
      metaDescription: z.string().optional().describe('Meta description'),
      containerId: z
        .string()
        .optional()
        .describe('HTML element ID to extract content from (URL evaluation only)'),
      containerClass: z
        .string()
        .optional()
        .describe('HTML element class to extract content from (URL evaluation only)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Evaluation result status'),
      score: z.number().optional().describe('Content optimization score'),
      error: z.string().optional().describe('Error message if evaluation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);

    let result = await client.evaluateContent({
      queryId: ctx.input.queryId,
      html: ctx.input.html,
      url: ctx.input.sourceUrl,
      title: ctx.input.title,
      description: ctx.input.metaDescription,
      containerId: ctx.input.containerId,
      containerClass: ctx.input.containerClass
    });

    let message =
      result.score !== undefined
        ? `Content score: **${result.score}**`
        : `Evaluation status: **${result.status}**${result.error ? ` - ${result.error}` : ''}`;

    return {
      output: {
        status: result.status,
        score: result.score,
        error: result.error
      },
      message
    };
  })
  .build();
