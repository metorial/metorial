import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findAndReplaceText = SlateTool.create(spec, {
  name: 'Find and Replace Text',
  key: 'find_and_replace_text',
  description: `Find and replace text within a PDF document on specified pages.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      searchText: z.string().describe('Text to search for'),
      replaceText: z.string().describe('Replacement text'),
      pages: z
        .string()
        .default('all')
        .describe('Pages to apply find/replace on (e.g. "1,2,3" or "all")')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF with replaced text'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findAndReplace({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      oldText: ctx.input.searchText,
      newText: ctx.input.replaceText,
      pageSequence: ctx.input.pages
    });

    return {
      output: result,
      message: `Replaced "${ctx.input.searchText}" with "${ctx.input.replaceText}" in **${result.fileName}**`
    };
  })
  .build();

export let flattenPdf = SlateTool.create(spec, {
  name: 'Flatten PDF',
  key: 'flatten_pdf',
  description: `Flatten a PDF to remove all interactive form fields, making the document read-only with all form data permanently embedded.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded flattened PDF'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.flattenPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    return {
      output: result,
      message: `Flattened PDF form fields in **${result.fileName}**`
    };
  })
  .build();

export let repairPdf = SlateTool.create(spec, {
  name: 'Repair PDF',
  key: 'repair_pdf',
  description: `Attempt to repair a damaged or corrupted PDF document to recover its content.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded damaged PDF file content'),
      fileName: z.string().describe('PDF file name with extension')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded repaired PDF'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.repairPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    return {
      output: result,
      message: `Successfully repaired PDF: **${result.fileName}**`
    };
  })
  .build();

export let linearizePdf = SlateTool.create(spec, {
  name: 'Linearize PDF',
  key: 'linearize_pdf',
  description: `Linearize (optimize) a PDF for fast web viewing. Linearized PDFs can start displaying before the full file is downloaded.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      compressType: z
        .enum(['Default', 'Web', 'Print'])
        .default('Web')
        .describe('Compression type to apply during linearization')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded linearized PDF'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.linearizePdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      optimizeProfile: ctx.input.compressType
    });

    return {
      output: result,
      message: `Linearized PDF for web viewing: **${result.fileName}**`
    };
  })
  .build();
