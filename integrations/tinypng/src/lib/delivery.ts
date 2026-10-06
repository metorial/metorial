import type { SlateAddAttachmentInput } from 'slates';
import type { CompressResult, OutputResult, TinifyClient } from './client';
import { invalid } from './validation';

type FileContext = {
  auth: { token: string; basicAuthorization?: string };
  addAttachment: (input: SlateAddAttachmentInput) => Promise<void>;
};
export async function deliverOriginal(
  ctx: FileContext,
  client: TinifyClient,
  result: CompressResult
): Promise<void> {
  const basic = `Basic ${Buffer.from(`api:${ctx.auth.token}`).toString('base64')}`;
  if (ctx.auth.basicAuthorization === basic) {
    await ctx.addAttachment({
      type: 'url',
      url: result.outputUrl,
      headers: { Authorization: ctx.auth.basicAuthorization },
      mimeType: result.outputType
    });
  } else {
    await deliverContent(ctx, await client.downloadOutput(result.outputUrl));
  }
}
export async function deliverContent(ctx: FileContext, result: OutputResult): Promise<void> {
  if (!result.content)
    throw invalid('No processed image was returned. Reconcile usage before retrying.');
  await ctx.addAttachment({
    type: 'content',
    content: result.content,
    mimeType: result.contentType,
    filename: `optimized.${result.contentType?.split('/')[1] ?? 'image'}`
  });
}
