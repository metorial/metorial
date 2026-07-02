import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractContent = SlateTool.create(spec, {
  name: 'Extract Content from PDF',
  key: 'extract_content',
  description: `Extract text, images, tables, or text matching a regular expression from a PDF document.
Use this to pull structured data out of PDFs for further processing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      extractType: z
        .enum(['text', 'images', 'textAndImages', 'tables', 'regex'])
        .describe('What to extract from the PDF'),
      regexExpression: z
        .string()
        .optional()
        .describe('Regular expression pattern (required when extractType is "regex")'),
      pages: z
        .string()
        .optional()
        .describe(
          'Pages to extract from (e.g. "1,2,3" or "all"). Required for regex extraction.'
        )
    })
  )
  .output(
    z.object({
      texts: z
        .array(z.string())
        .optional()
        .describe('Extracted text content (one entry per page)'),
      images: z
        .array(
          z.object({
            fileName: z.string().describe('Image file name'),
            fileContent: z.string().describe('Base64-encoded image content')
          })
        )
        .optional()
        .describe('Extracted images'),
      tables: z
        .array(
          z.object({
            pageNumber: z.number().describe('Page number where the table was found'),
            rows: z.array(z.array(z.string())).describe('Table rows and cells')
          })
        )
        .optional()
        .describe('Extracted tables'),
      matchedTexts: z.array(z.string()).optional().describe('Texts matching the regex pattern')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.extractType === 'tables') {
      let result = await client.extractTable({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName
      });
      let tables = (result.tableList ?? []).map(t => ({
        pageNumber: t.pageNumber,
        rows: t.table
      }));
      return {
        output: { tables },
        message: `Extracted **${tables.length}** table(s) from the PDF`
      };
    }

    if (ctx.input.extractType === 'regex') {
      if (!ctx.input.regexExpression || !ctx.input.pages) {
        throw new Error('regexExpression and pages are required for regex extraction');
      }
      let result = await client.extractTextByExpression({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        expression: ctx.input.regexExpression,
        pageSequence: ctx.input.pages
      });
      return {
        output: { matchedTexts: result.textList ?? [] },
        message: `Found **${(result.textList ?? []).length}** match(es) for pattern "${ctx.input.regexExpression}"`
      };
    }

    let extractText =
      ctx.input.extractType === 'text' || ctx.input.extractType === 'textAndImages';
    let extractImage =
      ctx.input.extractType === 'images' || ctx.input.extractType === 'textAndImages';

    let result = await client.extractResources({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      extractText,
      extractImage
    });

    let images = (result.images ?? []).map(img => ({
      fileName: img.fileName,
      fileContent: img.streamFile
    }));

    return {
      output: {
        texts: extractText ? (result.texts ?? []) : undefined,
        images: extractImage ? images : undefined
      },
      message: `Extracted${extractText ? ` text (${(result.texts ?? []).length} pages)` : ''}${extractText && extractImage ? ' and' : ''}${extractImage ? ` ${images.length} image(s)` : ''} from the PDF`
    };
  })
  .build();
