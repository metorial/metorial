import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSyntaxDependenciesTool = SlateTool.create(spec, {
  name: 'Get Syntax Dependencies',
  key: 'get_syntax_dependencies',
  description: `Provides syntactic dependency parse trees showing grammatical relationships between tokens in sentences. Each token is annotated with its dependency role (e.g., subject, object, modifier) relative to its head word.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to parse for syntax dependencies'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      sentences: z
        .array(
          z.object({
            tokens: z
              .array(
                z.object({
                  tokenIndex: z.number().describe('Index of this token in the sentence'),
                  text: z.string().describe('The token text'),
                  dependencyType: z
                    .string()
                    .describe('Dependency relation type (e.g., nsubj, dobj, root)'),
                  governorIndex: z
                    .number()
                    .describe('Index of the governor/head token (-1 for root)')
                })
              )
              .describe('Tokens with their dependency annotations')
          })
        )
        .describe('Parsed sentences with dependency trees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.syntaxDependencies(ctx.input.content, ctx.input.language);

    let sentences = result.sentences ?? [];

    return {
      output: {
        sentences
      },
      message: `Parsed syntax dependencies for **${sentences.length}** sentence${sentences.length === 1 ? '' : 's'}.`
    };
  })
  .build();
