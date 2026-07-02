import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public URL of the encrypted PDF file'),
    fileId: z
      .string()
      .optional()
      .describe('ConvertAPI file ID of a previously uploaded encrypted PDF'),
    base64Data: z.string().optional().describe('Base64-encoded encrypted PDF content'),
    fileName: z.string().optional().describe('File name (required when using base64Data)')
  })
  .describe(
    'Encrypted PDF file source — provide exactly one of: url, fileId, or base64Data (with fileName)'
  );

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
      conversionTime: z.number().describe('Decryption duration in seconds'),
      fileName: z.string().describe('Name of the decrypted PDF'),
      fileSize: z.number().describe('Size of the decrypted PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the decrypted PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'decrypt',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters: {
        Password: ctx.input.password
      }
    });

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
      message: `Decrypted PDF as \`${decrypted.fileName}\` (${formatBytes(decrypted.fileSize)}) in ${result.conversionTime}s.`
    };
  })
  .build();

function buildFileSource(file: {
  url?: string;
  fileId?: string;
  base64Data?: string;
  fileName?: string;
}) {
  if (file.url) {
    return { type: 'url' as const, url: file.url };
  }
  if (file.fileId) {
    return { type: 'fileId' as const, fileId: file.fileId };
  }
  if (file.base64Data && file.fileName) {
    return { type: 'base64' as const, fileName: file.fileName, data: file.base64Data };
  }
  throw new Error('Provide exactly one of: url, fileId, or base64Data (with fileName)');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
