import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { documentId, invalid, nativeAsset, parse, scopes } from '../lib/schemas';
import { spec } from '../spec';
import { fileName } from './upload-asset';

export const downloadAsset = SlateTool.create(spec, {
  name: 'Download Asset',
  key: 'download_asset',
  description:
    'Prepare the original file or image from an exact Content Lake asset document. Use upload_asset documentId/_id or query_documents to discover asset documents. This excludes Media Library signed/container URLs and transformations.',
  tags: { readOnly: true }
})
  .input(z.object({ ...scopes, documentId, filename: z.string().optional() }))
  .output(
    z.object({
      documentId: z.string(),
      assetId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const c = clientFor(ctx);
    const response = await c.getDocument(ctx.input.documentId);
    if (response.documents.length !== 1)
      throw invalid('The exact asset document is unavailable. Check ID and read permissions.');
    const doc = parse(nativeAsset, response.documents[0]);
    const prefix = `/${doc._type === 'sanity.imageAsset' ? 'images' : 'files'}/${c.project()}/${c.dataset}/`;
    const url = new URL(doc.url);
    if (
      url.origin !== 'https://cdn.sanity.io' ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      !url.pathname.startsWith(prefix) ||
      url.pathname !== `/${doc.path}` ||
      url.pathname.slice(prefix.length).includes('/')
    )
      throw invalid(
        'This asset does not expose a supported exact Content Lake CDN URL. Use a native dataset asset without custom, signed, or Media Library delivery.'
      );
    const filename =
      ctx.input.filename ?? doc.originalFilename ?? `${doc._id}.${doc.extension}`;
    if (!fileName.safeParse(filename).success)
      throw invalid('Provide a safe filename without path separators or control characters.');
    await ctx.addAttachment({
      type: 'url',
      url: doc.url,
      query: { dl: filename },
      mimeType: doc.mimeType,
      filename
    });
    return {
      output: {
        documentId: doc._id,
        assetId: doc.assetId,
        filename,
        mimeType: doc.mimeType,
        size: doc.size
      },
      message:
        'Prepared the exact original asset for download. CDN/cache retention can outlast document deletion.'
    };
  })
  .build();
