import { getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, nativeAsset, scopes } from '../lib/schemas';
import { spec } from '../spec';

export const fileName = z
  .string()
  .min(1)
  .max(255)
  .refine(
    value =>
      !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) &&
      !value.includes('/') &&
      !value.includes('\\') &&
      value !== '.' &&
      value !== '..'
  );
export const assetOutput = nativeAsset.extend({ documentId: z.string() });
export const uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description:
    'Upload bounded base64 image/file bytes into a selected dataset. Returns native assetId content hash and explicit documentId/_id for references and document operations. Identical bytes can reuse an existing asset, and CDN caches can persist after deletion.',
  instructions: [
    'Discover project/dataset before upload. The integration accepts at most 32 MiB decoded bytes.',
    'Never assume a returned asset is newly owned: Sanity deduplicates by content. Deleting its document can affect existing references and does not guarantee CDN cache removal.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      ...scopes,
      assetType: z.enum(['image', 'file']),
      contentBase64: z.string(),
      filename: z.string().optional(),
      contentType: z.string().optional()
    })
  )
  .output(z.object({ document: assetOutput }))
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if (
      !i.contentBase64 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(i.contentBase64)
    )
      throw invalid(
        'Provide canonical nonempty base64 without a data URL prefix or whitespace.'
      );
    if (getBase64ByteLength(i.contentBase64) > 32 * 1024 * 1024)
      throw invalid('Use a smaller upload of at most 32 MiB decoded bytes.');
    const bytes = Buffer.from(i.contentBase64, 'base64');
    if (bytes.toString('base64') !== i.contentBase64)
      throw invalid('Provide canonical base64 bytes.');
    if (i.filename !== undefined && !fileName.safeParse(i.filename).success)
      throw invalid('Use a filename without path separators or control characters.');
    if (
      i.contentType !== undefined &&
      !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(i.contentType)
    )
      throw invalid('Use a valid MIME type without parameters or control characters.');
    const result = await clientFor(ctx).uploadAsset(
      i.assetType,
      bytes,
      i.filename,
      i.contentType
    );
    return {
      output: { document: { ...result.document, documentId: result.document._id } },
      message:
        'Native asset receipt accepted. Content deduplication and retained CDN/cache effects apply.'
    };
  })
  .build();
