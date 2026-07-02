import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertFromPdf = SlateTool.create(spec, {
  name: 'Convert from PDF',
  key: 'convert_from_pdf',
  description: `Convert a PDF document to Word (.docx), Excel (.xlsx), or PowerPoint (.pptx) format.
Choose the target format and quality type to control the conversion output.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      targetFormat: z
        .enum(['word', 'excel', 'powerpoint'])
        .describe('Target format for conversion'),
      qualityType: z
        .enum(['Draft', 'High'])
        .default('High')
        .describe(
          'Conversion quality: "Draft" for faster processing, "High" for better quality'
        ),
      language: z
        .string()
        .optional()
        .describe('Language of the source file for better conversion accuracy'),
      mergeAllSheets: z
        .boolean()
        .optional()
        .describe('For Excel conversion: merge all sheets into one')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded converted file content'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { fileContent: string; fileName: string };

    if (ctx.input.targetFormat === 'word') {
      result = await client.convertPdfToWord({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        qualityType: ctx.input.qualityType,
        language: ctx.input.language
      });
    } else if (ctx.input.targetFormat === 'excel') {
      result = await client.convertPdfToExcel({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        qualityType: ctx.input.qualityType,
        language: ctx.input.language,
        mergeAllSheets: ctx.input.mergeAllSheets
      });
    } else {
      result = await client.convertPdfToPowerPoint({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        qualityType: ctx.input.qualityType,
        language: ctx.input.language
      });
    }

    return {
      output: result,
      message: `Successfully converted PDF to **${ctx.input.targetFormat}**: **${result.fileName}**`
    };
  })
  .build();
