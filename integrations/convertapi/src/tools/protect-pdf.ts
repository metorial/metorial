import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { deliverFiles } from '../lib/files';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

export let protectPdf = SlateTool.create(spec, {
  name: 'Protect PDF',
  key: 'protect_pdf',
  description: `Encrypt and password-protect a PDF document with AES 256-bit encryption.
Set user and owner passwords, and control permissions for printing and copying.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      file: fileSourceSchema,
      userPassword: z.string().optional().describe('Password required to open the PDF'),
      ownerPassword: z
        .string()
        .optional()
        .describe('Password for full document control (editing, printing permissions)'),
      allowPrinting: z.boolean().optional().describe('Allow printing the document'),
      allowCopying: z.boolean().optional().describe('Allow copying text from the document'),
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store encrypted file on ConvertAPI server for download')
    })
  )
  .output(
    z.object({
      conversionCost: z.number().describe('Number of conversion credits consumed'),
      conversionTime: z
        .number()
        .optional()
        .describe('Provider-reported legacy duration, when present'),
      fileName: z.string().describe('Name of the encrypted PDF'),
      fileSize: z.number().describe('Size of the encrypted PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the encrypted PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = { EncryptionAlgorithm: 'Aes256Bit' };

    if (ctx.input.userPassword !== undefined) {
      parameters.UserPassword = ctx.input.userPassword;
    }
    if (ctx.input.ownerPassword !== undefined) {
      parameters.OwnerPassword = ctx.input.ownerPassword;
    }
    if (ctx.input.allowPrinting !== undefined) {
      parameters.PrintDocument = ctx.input.allowPrinting ? 'true' : 'false';
    }
    if (ctx.input.allowCopying !== undefined) {
      parameters.CopyContents = ctx.input.allowCopying ? 'true' : 'false';
    }

    let rawResult = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'protect',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });
    let result = await deliverFiles(ctx, rawResult);

    let encrypted = result.files[0]!;
    return {
      output: {
        conversionCost: result.conversionCost,
        conversionTime: result.conversionTime,
        fileName: encrypted.fileName,
        fileSize: encrypted.fileSize,
        fileId: encrypted.fileId,
        url: encrypted.url
      },
      message: `Encrypted PDF as \`${encrypted.fileName}\` (${encrypted.fileSize} bytes).`
    };
  })
  .build();
