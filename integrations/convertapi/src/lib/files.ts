import type { SlateAddAttachmentInput } from 'slates';
import type { ConvertApiConversionResponse, ConvertApiFileResult } from './types';
import { base64, invalid } from './validation';

type Context = { addAttachment(input: SlateAddAttachmentInput): Promise<void> };
export const fileMetadata = ({ fileData: _content, ...metadata }: ConvertApiFileResult) =>
  metadata;
export async function deliverFiles(ctx: Context, result: ConvertApiConversionResponse) {
  for (const file of result.files) {
    if (file.url)
      await ctx.addAttachment({ type: 'url', url: file.url, filename: file.fileName });
    else if (file.fileData !== null) {
      const mimeType =
        file.fileExt === 'pdf'
          ? 'application/pdf'
          : file.fileExt === 'txt'
            ? 'text/plain; charset=utf-8'
            : 'application/octet-stream';
      await ctx.addAttachment({
        type: 'content',
        content: new Response(new Uint8Array(base64(file.fileData, true)), {
          headers: { 'content-type': mimeType }
        }),
        filename: file.fileName
      });
    } else
      throw invalid(
        'The converted file has no downloadable content. Reconcile the conversion before retrying.'
      );
  }
  return { ...result, files: result.files.map(fileMetadata) };
}
