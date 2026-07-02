import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadExtractionFilesTool = SlateTool.create(spec, {
  name: 'Upload Extraction Files',
  key: 'upload_extraction_files',
  description: `Upload files to an existing extraction for processing. Files are processed in batches. Provide publicly accessible file URLs. Supported formats: PDF, Word (.docx), text, PNG, JPG.`,
  instructions: [
    'Provide publicly accessible URLs to the files you want to process.',
    'If a batchId is provided, files are added to that existing batch. Otherwise, a new batch is created.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('Extraction template to process files against'),
      batchId: z
        .string()
        .optional()
        .describe('Existing batch to add files to (creates new batch if omitted)'),
      fileUrls: z.array(z.string()).describe('Publicly accessible URLs of files to upload')
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Extraction identifier'),
      batchId: z.string().describe('Batch identifier for retrieving results'),
      status: z.string().describe('Upload status'),
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Unique file identifier'),
            fileName: z.string().describe('Name of the uploaded file'),
            numberOfPages: z.number().optional().describe('Number of pages in the file'),
            fileUrl: z.string().optional().describe('URL to access the file')
          })
        )
        .optional()
        .describe('Uploaded files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.uploadFiles({
      extractionId: ctx.input.extractionId,
      batchId: ctx.input.batchId,
      fileUrls: ctx.input.fileUrls
    });

    let files = result.files?.map(
      (f: { fileId: string; fileName: string; numberOfPages?: number; url?: string }) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        numberOfPages: f.numberOfPages,
        fileUrl: f.url
      })
    );

    return {
      output: {
        extractionId: result.extractionId,
        batchId: result.batchId,
        status: result.status,
        files
      },
      message: `Uploaded ${ctx.input.fileUrls.length} file(s) to extraction \`${ctx.input.extractionId}\`, batch \`${result.batchId}\`.`
    };
  })
  .build();
