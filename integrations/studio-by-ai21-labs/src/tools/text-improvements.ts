import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let textImprovements = SlateTool.create(spec, {
  name: 'Text Improvements',
  key: 'text_improvements',
  description: `Analyze text and suggest improvements for fluency, vocabulary, and clarity. Select one or more improvement types to apply.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to analyze for improvements'),
      types: z
        .array(
          z.enum([
            'fluency',
            'vocabulary/specificity',
            'vocabulary/variety',
            'clarity/short-sentences',
            'clarity/conciseness'
          ])
        )
        .min(1)
        .describe('Types of improvements to suggest')
    })
  )
  .output(
    z.object({
      improvements: z
        .array(
          z.object({
            originalText: z.string().describe('Original text that can be improved'),
            suggestions: z
              .array(
                z.object({
                  text: z.string().describe('Suggested replacement text')
                })
              )
              .describe('Suggested improvements'),
            improvementType: z.string().optional().describe('Type of improvement'),
            startIndex: z.number().optional().describe('Start index of the original text'),
            endIndex: z.number().optional().describe('End index of the original text')
          })
        )
        .describe('List of improvement suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.textImprovements({
      text: ctx.input.text,
      types: ctx.input.types
    });

    let improvements = (result.improvements ?? []).map((imp: any) => ({
      originalText: imp.originalText ?? imp.original_text ?? '',
      suggestions: (imp.suggestions ?? []).map((s: any) => ({
        text: s.text ?? s
      })),
      improvementType: imp.improvementType ?? imp.improvement_type,
      startIndex: imp.startIndex ?? imp.start_index,
      endIndex: imp.endIndex ?? imp.end_index
    }));

    return {
      output: { improvements },
      message: `Found **${improvements.length}** improvement suggestion(s) for types: ${ctx.input.types.join(', ')}.`
    };
  })
  .build();
