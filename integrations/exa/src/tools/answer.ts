import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let answerTool = SlateTool.create(spec, {
  name: 'Answer Question',
  key: 'answer_question',
  description: `Get a direct AI-generated answer to a question with citations from the web. Exa searches the web and synthesizes an answer backed by source references.
Ideal for factual questions, research queries, and getting quick answers grounded in web sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The question to answer'),
      includeSourceText: z
        .boolean()
        .optional()
        .describe('Include the full text of cited sources in the response')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('The AI-generated answer'),
      citations: z
        .array(
          z.object({
            url: z.string().describe('Source URL'),
            title: z.string().optional().describe('Source page title'),
            author: z.string().optional().describe('Source author'),
            publishedDate: z.string().optional().describe('Publication date'),
            text: z
              .string()
              .optional()
              .describe('Source text content (when includeSourceText is true)')
          })
        )
        .describe('Web sources cited in the answer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let response = await client.answer({
      query: ctx.input.query,
      text: ctx.input.includeSourceText
    });

    let citations = response.citations.map(c => ({
      url: c.url,
      title: c.title,
      author: c.author,
      publishedDate: c.publishedDate,
      text: c.text
    }));

    return {
      output: {
        answer: response.answer,
        citations
      },
      message: `Answered with **${citations.length}** citations.`
    };
  })
  .build();
