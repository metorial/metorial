import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deepResearch = SlateTool.create(spec, {
  name: 'Deep Research',
  key: 'deep_research',
  description: `Perform AI-powered deep research on any topic. Submit a research query and receive comprehensive results with graphical insights, multiple research perspectives, citations, and detailed analysis.

Useful for market research, competitive analysis, topic exploration, and generating in-depth knowledge reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'The research topic or question to investigate, e.g. "Current trends in renewable energy adoption in Southeast Asia"'
        )
    })
  )
  .output(
    z.object({
      researchResults: z
        .any()
        .describe('Comprehensive research results including insights, analysis, and citations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Performing deep research...');

    let result = await client.deepResearch({
      query: ctx.input.query
    });

    return {
      output: {
        researchResults: result
      },
      message: `Successfully completed deep research on: "${ctx.input.query}"`
    };
  })
  .build();
