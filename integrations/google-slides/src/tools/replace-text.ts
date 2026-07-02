import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let replaceText = SlateTool.create(spec, {
  name: 'Replace Text',
  key: 'replace_text',
  description: `Performs bulk find-and-replace of text across an entire presentation. Ideal for filling in templates that use placeholder patterns like \`{{name}}\`, \`{{date}}\`, etc. Supports multiple replacements in a single call.`,
  instructions: [
    'Each replacement finds ALL occurrences of the search text across all slides and replaces them.',
    'Case sensitivity can be toggled per replacement.',
    'To fill a template, pass all placeholder replacements at once for best performance.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.replaceText)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      replacements: z
        .array(
          z.object({
            findText: z.string().describe('Text to search for'),
            replaceText: z.string().describe('Text to replace with'),
            matchCase: z
              .boolean()
              .optional()
              .describe('Whether to match case exactly (defaults to false)')
          })
        )
        .min(1)
        .describe('List of text replacements to perform')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      replacementCount: z.number().describe('Total number of replacements performed'),
      replacements: z
        .array(
          z.object({
            findText: z.string().describe('Text that was searched for'),
            occurrencesChanged: z.number().describe('Number of occurrences replaced')
          })
        )
        .describe('Details of each replacement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, replacements } = ctx.input;

    let requests = replacements.map(r => ({
      replaceAllText: {
        containsText: {
          text: r.findText,
          matchCase: r.matchCase ?? false
        },
        replaceText: r.replaceText
      }
    }));

    let result = await client.batchUpdate(presentationId, requests);

    let totalCount = 0;
    let details = replacements.map((r, i) => {
      let occurrences = result.replies?.[i]?.replaceAllText?.occurrencesChanged ?? 0;
      totalCount += occurrences;
      return {
        findText: r.findText,
        occurrencesChanged: occurrences
      };
    });

    return {
      output: {
        presentationId,
        replacementCount: totalCount,
        replacements: details
      },
      message: `Replaced **${totalCount}** total occurrence(s) across **${replacements.length}** replacement pattern(s).`
    };
  })
  .build();
