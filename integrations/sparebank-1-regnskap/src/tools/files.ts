import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spareBankRegnskapValidationError } from '../lib/errors';
import { spec } from '../spec';
import { createClient, requireCompanyKey } from './shared';

export let normalizeStorageReference = (value: string) => {
  let storageReference = value.trim();
  if (!storageReference) {
    throw spareBankRegnskapValidationError(
      'storageReference is required to download a SpareBank 1 Regnskap file.'
    );
  }

  return storageReference;
};

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Download a SpareBank 1 Regnskap file from the Unimicro file service by StorageReference and return it as a Slate attachment.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      storageReference: z.string().describe('Unimicro file StorageReference to download.'),
      companyKey: z
        .string()
        .optional()
        .describe('Unimicro CompanyKey. Required unless configured globally.'),
      fileName: z.string().optional().describe('Optional attachment filename metadata.'),
      mimeType: z.string().optional().describe('Optional expected MIME type.')
    })
  )
  .output(
    z.object({
      storageReference: z.string(),
      fileName: z.string().optional(),
      mimeType: z.string(),
      byteLength: z.number(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let storageReference = normalizeStorageReference(ctx.input.storageReference);
    let client = createClient(ctx);
    let file = await client.downloadFile({
      storageReference,
      companyKey: requireCompanyKey(ctx, ctx.input.companyKey),
      fileName: ctx.input.fileName,
      mimeType: ctx.input.mimeType
    });

    return {
      output: {
        storageReference,
        fileName: file.fileName,
        mimeType: file.mimeType,
        byteLength: file.byteLength,
        attachmentCount: 1
      },
      message: `Downloaded SpareBank 1 Regnskap file **${file.fileName ?? storageReference}**.`,
      attachments: [createBase64Attachment(file.contentBase64, file.mimeType)]
    };
  })
  .build();
