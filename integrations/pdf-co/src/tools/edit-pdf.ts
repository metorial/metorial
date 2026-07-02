import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editPdf = SlateTool.create(spec, {
  name: 'Edit PDF',
  key: 'edit_pdf',
  description: `Edit an existing PDF by adding text annotations, images, or filling form fields. You can also search and replace text, delete text, or remove specific pages.
Combines multiple editing capabilities in a single tool — specify which operations to perform using the appropriate parameters.`,
  instructions: [
    'To add text overlays, use the "annotations" array with x, y coordinates and text content.',
    'To add images or signatures, use the "images" array with x, y coordinates and an image URL.',
    'To fill form fields, use the "formFields" array with field names and values.',
    'To replace text throughout the PDF, use "searchStrings" and "replaceStrings".',
    'To delete text, use "searchStrings" with "deleteMatchedText" set to true.',
    'To remove pages, use "pagesToDelete".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source PDF file to edit'),
      annotations: z
        .array(
          z.object({
            x: z.number().describe('X coordinate position'),
            y: z.number().describe('Y coordinate position'),
            text: z.string().describe('Text content to add'),
            size: z.number().optional().describe('Font size in points'),
            color: z.string().optional().describe('Text color, e.g. "#FF0000" or "red"'),
            fontName: z
              .string()
              .optional()
              .describe('Font name, e.g. "Arial", "Times New Roman"'),
            pages: z.string().optional().describe('Pages to add annotation to, e.g. "0,1,2"')
          })
        )
        .optional()
        .describe('Text annotations to add to the PDF'),
      images: z
        .array(
          z.object({
            x: z.number().describe('X coordinate position'),
            y: z.number().describe('Y coordinate position'),
            url: z.string().describe('URL of the image to insert'),
            width: z.number().optional().describe('Image width in points'),
            height: z.number().optional().describe('Image height in points'),
            pages: z.string().optional().describe('Pages to add image to, e.g. "0,1,2"')
          })
        )
        .optional()
        .describe('Images to insert into the PDF'),
      formFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Name of the form field to fill'),
            text: z.string().describe('Value to set for the form field')
          })
        )
        .optional()
        .describe('Form fields to populate'),
      searchStrings: z
        .array(z.string())
        .optional()
        .describe(
          'Text strings to search for (used with replaceStrings or deleteMatchedText)'
        ),
      replaceStrings: z
        .array(z.string())
        .optional()
        .describe('Replacement strings corresponding to each search string'),
      deleteMatchedText: z
        .boolean()
        .optional()
        .describe('Delete text matching searchStrings instead of replacing'),
      caseSensitive: z.boolean().optional().describe('Case-sensitive search (default: true)'),
      regex: z.boolean().optional().describe('Enable regex matching for search strings'),
      pagesToDelete: z
        .string()
        .optional()
        .describe('Pages to remove from the PDF, e.g. "0,3,5"'),
      pages: z.string().optional().describe('Limit editing operations to specific pages'),
      password: z.string().optional().describe('Password for protected PDF files'),
      outputFileName: z.string().optional().describe('Name for the output file')
    })
  )
  .output(
    z.object({
      outputUrl: z.string().describe('URL to download the edited PDF'),
      pageCount: z.number().describe('Number of pages in the output PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;
    let operations: string[] = [];

    // Handle page deletion
    if (ctx.input.pagesToDelete) {
      result = await client.deletePages({
        url: ctx.input.sourceUrl,
        pages: ctx.input.pagesToDelete,
        name: ctx.input.outputFileName,
        password: ctx.input.password
      });
      operations.push('deleted pages');
    }

    // Handle search and delete text
    if (ctx.input.searchStrings && ctx.input.deleteMatchedText) {
      let sourceUrl = result?.url || ctx.input.sourceUrl;
      result = await client.searchAndDeleteText({
        url: sourceUrl,
        searchStrings: ctx.input.searchStrings,
        caseSensitive: ctx.input.caseSensitive,
        regex: ctx.input.regex,
        pages: ctx.input.pages,
        password: ctx.input.password,
        name: ctx.input.outputFileName
      });
      operations.push('deleted matched text');
    }

    // Handle search and replace text
    if (ctx.input.searchStrings && ctx.input.replaceStrings && !ctx.input.deleteMatchedText) {
      let sourceUrl = result?.url || ctx.input.sourceUrl;
      result = await client.searchAndReplaceText({
        url: sourceUrl,
        searchStrings: ctx.input.searchStrings,
        replaceStrings: ctx.input.replaceStrings,
        caseSensitive: ctx.input.caseSensitive,
        regex: ctx.input.regex,
        pages: ctx.input.pages,
        password: ctx.input.password,
        name: ctx.input.outputFileName
      });
      operations.push('replaced text');
    }

    // Handle annotations, images, and form fields
    if (ctx.input.annotations || ctx.input.images || ctx.input.formFields) {
      let sourceUrl = result?.url || ctx.input.sourceUrl;
      result = await client.addToPdf({
        url: sourceUrl,
        annotations: ctx.input.annotations,
        images: ctx.input.images,
        fields: ctx.input.formFields,
        name: ctx.input.outputFileName,
        password: ctx.input.password
      });
      if (ctx.input.annotations) operations.push('added text');
      if (ctx.input.images) operations.push('added images');
      if (ctx.input.formFields) operations.push('filled form fields');
    }

    if (!result) {
      throw new Error(
        'No editing operations specified. Please provide at least one edit action.'
      );
    }

    if (result.error) {
      throw new Error(`PDF editing failed: ${result.message || 'Unknown error'}`);
    }

    return {
      output: {
        outputUrl: result.url,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `Edited PDF — ${operations.join(', ')}. ${result.pageCount} page(s). [Download edited PDF](${result.url})`
    };
  })
  .build();
