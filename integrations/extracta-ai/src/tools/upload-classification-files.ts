import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadClassificationFilesTool = SlateTool.create(spec, {
  name: 'Upload Classification Files',
  key: 'upload_classification_files',
  description: `Upload files to an existing classification for automatic categorization. Provide publicly accessible file URLs. Supported formats: PDF, Word (.docx), text, PNG, JPG.`,
  instructions: [
    'Provide publicly accessible URLs to the files you want to classify.',
    'If a batchId is provided, files are added to that existing batch. Otherwise, a new batch is created.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      classificationId: z.string().describe('Classification to process files against'),
      batchId: z
        .string()
        .optional()
        .describe('Existing batch to add files to (creates new batch if omitted)'),
      fileUrls: z.array(z.string()).describe('Publicly accessible URLs of files to upload')
    })
  )
  .output(
    z.object({
      classificationId: z.string().describe('Classification identifier'),
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

    let result = await client.uploadClassificationFiles({
      classificationId: ctx.input.classificationId,
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
        classificationId: result.classificationId,
        batchId: result.batchId,
        status: result.status,
        files
      },
      message: `Uploaded ${ctx.input.fileUrls.length} file(s) to classification \`${ctx.input.classificationId}\`, batch \`${result.batchId}\`.`
    };
  })
  .build();
