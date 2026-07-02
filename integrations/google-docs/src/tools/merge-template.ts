import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient, type Request } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

export let mergeTemplate = SlateTool.create(spec, {
  name: 'Merge Template',
  key: 'merge_template',
  description: `Replaces placeholder text in a Google Docs document with dynamic values. Useful for mail merge, generating personalized documents from templates, or populating forms. Each placeholder is replaced with its corresponding value throughout the document.`,
  instructions: [
    'Common placeholder formats: {{placeholder}}, {placeholder}, [[placeholder]], or any consistent pattern',
    'All occurrences of each placeholder are replaced throughout the document',
    'Placeholders are matched exactly as specified (case-sensitive by default)'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.mergeTemplate)
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to merge'),
      replacements: z
        .array(
          z.object({
            placeholder: z
              .string()
              .describe('The placeholder text to find (e.g., "{{name}}" or "[[date]]")'),
            value: z.string().describe('The value to replace the placeholder with'),
            matchCase: z
              .boolean()
              .optional()
              .default(true)
              .describe('Whether to match case when finding placeholders')
          })
        )
        .min(1)
        .describe('List of placeholder-value pairs to replace')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the merged document'),
      replacementsApplied: z.number().describe('Number of replacement operations applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    let requests: Request[] = ctx.input.replacements.map(r => ({
      replaceAllText: {
        replaceText: r.value,
        containsText: {
          text: r.placeholder,
          matchCase: r.matchCase ?? true
        }
      }
    }));

    let response = await client.batchUpdate(ctx.input.documentId, requests);

    return {
      output: {
        documentId: response.documentId,
        replacementsApplied: requests.length
      },
      message: `Applied **${requests.length} replacement(s)** to document \`${response.documentId}\``
    };
  })
  .build();
