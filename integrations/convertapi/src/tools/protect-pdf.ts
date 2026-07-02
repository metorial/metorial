import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSourceSchema = z
  .object({
    url: z.string().optional().describe('Public URL of the PDF file'),
    fileId: z.string().optional().describe('ConvertAPI file ID of a previously uploaded PDF'),
    base64Data: z.string().optional().describe('Base64-encoded PDF content'),
    fileName: z.string().optional().describe('File name (required when using base64Data)')
  })
  .describe(
    'PDF file source — provide exactly one of: url, fileId, or base64Data (with fileName)'
  );

export let protectPdf = SlateTool.create(spec, {
  name: 'Protect PDF',
  key: 'protect_pdf',
  description: `Encrypt and password-protect a PDF document with AES 256-bit encryption.
Set user and owner passwords, and control permissions for printing, copying, and editing.`,
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
      conversionTime: z.number().describe('Encryption duration in seconds'),
      fileName: z.string().describe('Name of the encrypted PDF'),
      fileSize: z.number().describe('Size of the encrypted PDF in bytes'),
      fileId: z.string().nullable().describe('ConvertAPI file ID'),
      url: z.string().nullable().describe('Download URL for the encrypted PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);
    let parameters: Record<string, string> = {};

    if (ctx.input.userPassword) {
      parameters.UserPassword = ctx.input.userPassword;
    }
    if (ctx.input.ownerPassword) {
      parameters.OwnerPassword = ctx.input.ownerPassword;
    }
    if (ctx.input.allowPrinting !== undefined) {
      parameters.AllowPrint = ctx.input.allowPrinting ? 'true' : 'false';
    }
    if (ctx.input.allowCopying !== undefined) {
      parameters.AllowCopy = ctx.input.allowCopying ? 'true' : 'false';
    }

    let result = await client.convert({
      sourceFormat: 'pdf',
      destinationFormat: 'encrypt',
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters
    });

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
      message: `Encrypted PDF as \`${encrypted.fileName}\` (${formatBytes(encrypted.fileSize)}) in ${result.conversionTime}s.`
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
