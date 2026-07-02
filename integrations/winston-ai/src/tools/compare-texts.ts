import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compareTexts = SlateTool.create(spec, {
  name: 'Compare Texts',
  key: 'compare_texts',
  description: `Compares two pieces of text to identify similarities and differences. Returns an overall similarity score (0-100), per-text matching word counts, similarity percentages, and detailed item-level match positions.

Useful for checking if two texts share common content, detecting paraphrasing, or verifying text originality between documents.`,
  constraints: [
    'Each text can be up to 120,000 characters.',
    'Costs 0.5 credits per total word across both texts.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      firstText: z.string().describe('The first text to compare (up to 120,000 characters)'),
      secondText: z
        .string()
        .describe('The second text to compare against the first (up to 120,000 characters)')
    })
  )
  .output(
    z.object({
      similarityScore: z
        .number()
        .describe('Overall similarity score between the two texts (0-100)'),
      firstTextAnalysis: z
        .object({
          totalWordCount: z.number().describe('Total words in the first text'),
          matchingWordCount: z
            .number()
            .describe('Words in the first text matching the second'),
          similarityPercentage: z
            .number()
            .describe('Percentage of the first text that matches'),
          matchSegments: z
            .array(
              z.object({
                type: z.string().describe('Type of match segment'),
                wordCount: z.number().describe('Number of words in this segment'),
                startIndex: z.number().describe('Starting character index of this segment'),
                length: z.number().describe('Character length of this segment')
              })
            )
            .describe('Detailed match segments with positions')
        })
        .describe('Analysis results for the first text'),
      secondTextAnalysis: z
        .object({
          totalWordCount: z.number().describe('Total words in the second text'),
          matchingWordCount: z
            .number()
            .describe('Words in the second text matching the first'),
          similarityPercentage: z
            .number()
            .describe('Percentage of the second text that matches'),
          matchSegments: z
            .array(
              z.object({
                type: z.string().describe('Type of match segment'),
                wordCount: z.number().describe('Number of words in this segment'),
                startIndex: z.number().describe('Starting character index of this segment'),
                length: z.number().describe('Character length of this segment')
              })
            )
            .describe('Detailed match segments with positions')
        })
        .describe('Analysis results for the second text'),
      creditsUsed: z.number().describe('Number of credits consumed'),
      creditsRemaining: z.number().describe('Remaining account credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.compareTexts({
      firstText: ctx.input.firstText,
      secondText: ctx.input.secondText
    });

    let mapTextResult = (t: typeof result.first_text) => ({
      totalWordCount: t.total_word_count,
      matchingWordCount: t.matching_word_count,
      similarityPercentage: t.similarity_percentage,
      matchSegments: (t.items ?? []).map(item => ({
        type: item.type,
        wordCount: item.word_count,
        startIndex: item.start_index,
        length: item.length
      }))
    });

    return {
      output: {
        similarityScore: result.similarity_score,
        firstTextAnalysis: mapTextResult(result.first_text),
        secondTextAnalysis: mapTextResult(result.second_text),
        creditsUsed: result.credits_used,
        creditsRemaining: result.credits_remaining
      },
      message: `Text comparison complete. **Similarity score: ${result.similarity_score}/100**. First text: ${result.first_text.matching_word_count}/${result.first_text.total_word_count} words match (${result.first_text.similarity_percentage}%). Second text: ${result.second_text.matching_word_count}/${result.second_text.total_word_count} words match (${result.second_text.similarity_percentage}%). Credits used: ${result.credits_used}.`
    };
  });
