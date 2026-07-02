import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractPages = SlateTool.create(spec, {
  name: 'Extract Pages',
  key: 'extract_pages',
  description: `Extract specific pages from a PDF document into a new PDF. Specify which pages to keep by their page numbers.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      pageNumbers: z
        .string()
        .describe('Comma-separated page numbers to extract (e.g. "1,3,5")')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF with extracted pages'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractPages({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      pageNumbers: ctx.input.pageNumbers
    });

    return {
      output: result,
      message: `Extracted pages ${ctx.input.pageNumbers} into **${result.fileName}**`
    };
  })
  .build();

export let deletePages = SlateTool.create(spec, {
  name: 'Delete Pages',
  key: 'delete_pages',
  description: `Remove specific pages or blank pages from a PDF document. Use page numbers for targeted removal or automatic blank page detection.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      mode: z
        .enum(['specific', 'blank'])
        .describe(
          '"specific" to delete by page numbers, "blank" to auto-detect and remove blank pages'
        ),
      pageNumbers: z
        .string()
        .optional()
        .describe(
          'Comma-separated page numbers to delete (required for "specific" mode, e.g. "2,4")'
        ),
      blankPageOption: z
        .enum(['blankOnly', 'nearlyBlank'])
        .optional()
        .describe(
          'For "blank" mode: "blankOnly" for completely blank pages, "nearlyBlank" for pages with minimal content'
        )
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF with pages removed'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { fileContent: string; fileName: string };

    if (ctx.input.mode === 'blank') {
      result = await client.deleteBlankPages({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        deletePageOption: ctx.input.blankPageOption ?? 'blankOnly'
      });
    } else {
      if (!ctx.input.pageNumbers) {
        throw new Error('pageNumbers is required for specific page deletion');
      }
      result = await client.deletePages({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        pageNumbers: ctx.input.pageNumbers
      });
    }

    return {
      output: result,
      message:
        ctx.input.mode === 'blank'
          ? `Removed blank pages from **${result.fileName}**`
          : `Removed pages ${ctx.input.pageNumbers} from **${result.fileName}**`
    };
  })
  .build();

export let rotatePdf = SlateTool.create(spec, {
  name: 'Rotate PDF',
  key: 'rotate_pdf',
  description: `Rotate pages in a PDF document. Rotate all pages at once or a specific page by 90, 180, or 270 degrees.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      rotationType: z.enum(['rotate90', 'rotate180', 'rotate270']).describe('Rotation angle'),
      pageNumber: z
        .number()
        .optional()
        .describe('Specific page to rotate (omit to rotate all pages)')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded rotated PDF'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { fileContent: string; fileName: string };

    if (ctx.input.pageNumber !== undefined) {
      result = await client.rotatePage({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        page: ctx.input.pageNumber,
        rotationType: ctx.input.rotationType
      });
    } else {
      result = await client.rotateDocument({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        rotationType: ctx.input.rotationType
      });
    }

    return {
      output: result,
      message:
        ctx.input.pageNumber !== undefined
          ? `Rotated page ${ctx.input.pageNumber} by ${ctx.input.rotationType.replace('rotate', '')}°: **${result.fileName}**`
          : `Rotated all pages by ${ctx.input.rotationType.replace('rotate', '')}°: **${result.fileName}**`
    };
  })
  .build();

export let addPageNumbers = SlateTool.create(spec, {
  name: 'Add Page Numbers',
  key: 'add_page_numbers',
  description: `Add page numbers to a PDF document. Configure position, font size, formatting, and whether to skip the first page.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      alignX: z
        .enum(['Left', 'Center', 'Right'])
        .default('Center')
        .describe('Horizontal position of page numbers'),
      alignY: z
        .enum(['Top', 'Bottom'])
        .default('Bottom')
        .describe('Vertical position of page numbers'),
      fontSize: z.number().default(12).describe('Font size for page numbers'),
      pageNumberFormat: z
        .string()
        .optional()
        .describe('Page number format (e.g. "Page {0} of {1}")'),
      marginXInMM: z.number().optional().describe('Horizontal margin in mm'),
      marginYInMM: z.number().optional().describe('Vertical margin in mm'),
      isBold: z.boolean().optional().describe('Bold page numbers'),
      isItalic: z.boolean().optional().describe('Italic page numbers'),
      skipFirstPage: z.boolean().optional().describe('Skip numbering on the first page')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF with page numbers'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addPageNumber({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      alignX: ctx.input.alignX,
      alignY: ctx.input.alignY,
      fontSize: ctx.input.fontSize,
      pageNumberFormat: ctx.input.pageNumberFormat,
      marginXinMM: ctx.input.marginXInMM,
      marginYinMM: ctx.input.marginYInMM,
      isBold: ctx.input.isBold,
      isItalic: ctx.input.isItalic,
      skipFirstPage: ctx.input.skipFirstPage
    });

    return {
      output: result,
      message: `Added page numbers to **${result.fileName}**`
    };
  })
  .build();
