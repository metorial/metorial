import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let extractFullText = SlateTool.create(spec, {
  name: 'Extract Full Text',
  key: 'extract_full_text',
  description: `Extract the complete raw text from documents or images using Nanonets OCR. Unlike structured extraction, this returns all text found in the document without field mapping. Useful for getting the raw content of PDFs, scanned documents, and images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z
        .array(z.string())
        .min(1)
        .describe('URLs of documents or images to extract text from (PDF, PNG, JPG)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            sourceUrl: z.string().describe('URL of the source document'),
            extractedText: z.string().describe('Full extracted text from the document')
          })
        )
        .describe('Extracted text for each document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.fullTextOcrByUrl(ctx.input.urls);

    let results: Array<{ sourceUrl: string; extractedText: string }> = [];

    if (result.results || result.result) {
      let items = result.results || result.result || [];
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          results.push({
            sourceUrl: ctx.input.urls[i] || '',
            extractedText:
              typeof items[i] === 'string'
                ? items[i]
                : items[i]?.raw_text || items[i]?.text || JSON.stringify(items[i])
          });
        }
      }
    } else if (typeof result.raw_text === 'string') {
      results.push({
        sourceUrl: ctx.input.urls[0] || '',
        extractedText: result.raw_text
      });
    } else {
      results.push({
        sourceUrl: ctx.input.urls[0] || '',
        extractedText: JSON.stringify(result)
      });
    }

    let totalChars = results.reduce((sum, r) => sum + r.extractedText.length, 0);

    return {
      output: {
        results
      },
      message: `Extracted **${totalChars}** characters of text from **${ctx.input.urls.length}** document(s).`
    };
  })
  .build();
