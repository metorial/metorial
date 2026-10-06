import { createHash } from 'node:crypto';
import { SlateTool } from 'slates';
import { getClient } from '../lib/client';
import { invalid, one, resourceId, z } from '../lib/schemas';
import { spec } from '../spec';
export const exportContent = SlateTool.create(spec, {
  key: 'export_content',
  name: 'Export Content',
  description:
    'Download a bounded local HTML or JSON snapshot of one exact post or page. The snapshot contains the current accessible API representation; it is not a site backup or a historical revision.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['post', 'page']),
      resourceId: resourceId.describe('Exact native ID from browse_posts or browse_pages.'),
      format: z.enum(['html', 'json']),
      api: z.enum(['admin', 'content']).optional()
    })
  )
  .output(
    z.object({
      resource: z.enum(['post', 'page']),
      resourceId: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      size: z.number().int(),
      sha256: z.string(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = getClient(ctx, ctx.input.api);
    const params = {
      formats:
        ctx.input.format === 'html'
          ? 'html'
          : client.mode === 'content_api_key'
            ? 'html,plaintext'
            : 'html,lexical',
      include: 'tags,authors'
    };
    const key = ctx.input.resource === 'post' ? 'posts' : 'pages';
    const row = one(
      ctx.input.resource === 'post'
        ? await client.readPost(ctx.input.resourceId, params)
        : await client.readPage(ctx.input.resourceId, params),
      key,
      { id: ctx.input.resourceId }
    );
    if (ctx.input.format === 'html' && typeof row.html !== 'string')
      throw invalid(
        'Ghost did not return HTML for this exact resource. Request a JSON snapshot or check content access.'
      );
    const bytes = Buffer.from(
      ctx.input.format === 'html' ? row.html : JSON.stringify(row, null, 2)
    );
    if (bytes.length > 16 * 1024 * 1024)
      throw invalid('This single-content export exceeds the 16 MiB limit.');
    const fileName = `${ctx.input.resource}-${row.id}.${ctx.input.format}`,
      mimeType = ctx.input.format === 'html' ? 'text/html' : 'application/json';
    await ctx.addAttachment({ type: 'content', content: bytes, filename: fileName, mimeType });
    return {
      output: {
        resource: ctx.input.resource,
        resourceId: row.id,
        fileName,
        mimeType,
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        updatedAt: row.updated_at
      },
      message: 'Prepared the current content snapshot for download.'
    };
  })
  .build();
