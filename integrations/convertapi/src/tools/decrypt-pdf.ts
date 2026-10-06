import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

export let decryptPdf = SlateTool.create(spec, {
  name: 'Decrypt PDF',
  key: 'decrypt_pdf',
  description: `Decrypt a password-protected PDF document. Removes encryption and password restrictions from the PDF.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: fileSourceSchema,
      password: z.string().describe('Password to decrypt the PDF'),
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store decrypted file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the decrypted PDF'),
      fileSize: z.number().describe('Size of the decrypted PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the decrypted PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'unprotect',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters: {
        Password: ctx.input.password
      }
    });
    let result = await deliverFiles(ctx, rawResult);

    let decrypted = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: decrypted.fileName,
        fileSize: decrypted.fileSize,
        fileId: decrypted.fileId,
        url: decrypted.url
      },
      message: `Decrypted PDF as \`${decrypted.fileName}\` (${decrypted.fileSize} bytes).`
    };
  })
  .build();
