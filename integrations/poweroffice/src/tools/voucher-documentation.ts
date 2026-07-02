import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildListParams,
  compactOutput,
  createClient,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let voucherDocumentationSchema = z.object({
  voucherId: z.string().optional().describe('Voucher id.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherType: z.string().optional().describe('Voucher type.'),
  hasPdf: z.boolean().optional().describe('Whether PDF documentation is available.'),
  hasImages: z.boolean().optional().describe('Whether image documentation is available.'),
  hasEhf: z.boolean().optional().describe('Whether EHF documentation is available.'),
  hasSalesOrderAttachments: z
    .boolean()
    .optional()
    .describe('Whether sales order attachments are available.'),
  isImported: z.boolean().optional().describe('Whether the voucher was imported.'),
  record: rawRecordSchema
});

let mapVoucherDocumentation = (voucher: Record<string, unknown>) => ({
  ...compactOutput({
    voucherId: stringValue(voucher, 'VoucherId'),
    voucherNo: numberValue(voucher, 'VoucherNo'),
    voucherType: stringValue(voucher, 'VoucherType'),
    hasPdf: typeof voucher.HasPdf === 'boolean' ? (voucher.HasPdf as boolean) : undefined,
    hasImages:
      typeof voucher.HasImages === 'boolean' ? (voucher.HasImages as boolean) : undefined,
    hasEhf: typeof voucher.HasEhf === 'boolean' ? (voucher.HasEhf as boolean) : undefined,
    hasSalesOrderAttachments:
      typeof voucher.HasSalesOrderAttachments === 'boolean'
        ? (voucher.HasSalesOrderAttachments as boolean)
        : undefined,
    isImported:
      typeof voucher.IsImported === 'boolean' ? (voucher.IsImported as boolean) : undefined
  }),
  record: voucher
});

export let powerofficeDownloadVoucherDocumentation = SlateTool.create(spec, {
  name: 'Download PowerOffice Voucher Documentation',
  key: 'poweroffice_download_voucher_documentation',
  description:
    'List available PowerOffice voucher documentation and optionally download a specific voucher document as a Slate attachment for audit workflows.',
  instructions: [
    'Use action "list" with voucherNo or voucherId to inspect available documentation.',
    'Use action "download" with voucherId to return the document through a Slate attachment.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'download'])
        .describe('List voucher documentation metadata or download a specific document.'),
      voucherId: z
        .string()
        .optional()
        .describe('Voucher id. Required for action "download"; optional id filter for list.'),
      voucherNo: z.number().int().optional().describe('Voucher number filter for list.'),
      documentationType: z
        .string()
        .optional()
        .describe('PowerOffice documentation type to download, for example Images or Pdf.'),
      filename: z
        .string()
        .optional()
        .describe('Attachment filename override for downloaded documentation.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      action: z.enum(['list', 'download']).describe('Action performed.'),
      vouchers: z
        .array(voucherDocumentationSchema)
        .optional()
        .describe('Voucher documentation metadata for list action.'),
      page: paginationOutputSchema.optional(),
      voucherId: z.string().optional().describe('Downloaded voucher id.'),
      filename: z.string().optional().describe('Attachment filename.'),
      mimeType: z.string().optional().describe('Downloaded document MIME type.'),
      sizeBytes: z.number().optional().describe('Downloaded document byte size.'),
      attachmentCount: z.number().optional().describe('Number of attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'list') {
      let vouchers = await client.listVoucherDocumentation(
        buildListParams(ctx.input, {
          id: ctx.input.voucherId,
          voucherNo: ctx.input.voucherNo
        })
      );

      return {
        output: {
          action: 'list',
          vouchers: vouchers.map(mapVoucherDocumentation),
          page: pageSummary(ctx.input, vouchers.length)
        },
        message: `Retrieved **${vouchers.length}** PowerOffice voucher documentation record(s).`
      };
    }

    if (!ctx.input.voucherId) {
      throw powerOfficeValidationError('voucherId is required when action is download.');
    }

    let download = await client.downloadVoucherDocumentation({
      id: ctx.input.voucherId,
      documentationType: ctx.input.documentationType,
      filename: ctx.input.filename
    });

    return {
      output: {
        action: 'download',
        voucherId: ctx.input.voucherId,
        filename: download.filename,
        mimeType: download.mimeType,
        sizeBytes: download.sizeBytes,
        attachmentCount: 1
      },
      message: `Downloaded PowerOffice voucher documentation **${download.filename}**.`,
      attachments: [createBase64Attachment(download.contentBase64, download.mimeType)]
    };
  })
  .build();
