import { createApiServiceError } from 'slates';
import { z } from 'zod';

const falFileSchema = z.object({
  url: z.union([
    z.url().regex(/^https?:\/\//),
    z.string().regex(/^data:[^;,]+;base64,[A-Za-z0-9+/]+={0,2}$/)
  ]),
  content_type: z.string().nullish(),
  file_name: z.string().nullish(),
  file_size: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  duration: z.number().nullish()
});
export type FalFile = z.infer<typeof falFileSchema>;

type FileContext = {
  addAttachment(
    input:
      | { type: 'url'; url: string; mimeType?: string }
      | { type: 'content'; content: Response; mimeType?: string; filename?: string }
  ): Promise<void>;
};

const decodeInlineFile = (url: string) => {
  const [, mimeType, encoded] =
    /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url) ?? [];
  const bytes = encoded ? Buffer.from(encoded, 'base64') : undefined;
  if (
    !mimeType ||
    !encoded ||
    !bytes?.byteLength ||
    bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
  ) {
    throw createApiServiceError('The model returned an invalid encoded file.', {
      reason: 'fal_invalid_file'
    });
  }
  return { bytes, mimeType };
};

export const publicFalFileUrl = (file: FalFile): string | undefined =>
  file.url.startsWith('data:') ? undefined : file.url;

export const requireFalFile = (value: unknown, kind: string): FalFile => {
  const parsed = falFileSchema.safeParse(typeof value === 'string' ? { url: value } : value);
  if (!parsed.success) {
    throw createApiServiceError(
      `The model did not return a downloadable ${kind}. Check the model's output schema with search_models using includeSchema=true.`,
      {
        reason: 'fal_missing_file'
      }
    );
  }
  const file = parsed.data;
  if (publicFalFileUrl(file)) return file;
  const inline = decodeInlineFile(file.url);
  return {
    ...file,
    content_type: file.content_type ?? inline.mimeType,
    file_size: file.file_size ?? inline.bytes.byteLength
  };
};

// File outputs have model-specific field names but share fal's File object.
// https://fal.ai/models/fal-ai/flux/schnell/api and https://fal.ai/models/fal-ai/f5-tts/api
export const addModelFiles = async (ctx: FileContext, result: unknown): Promise<unknown> => {
  const seen = new Set<string>();
  const addFile = async (file: FalFile) => {
    if (seen.has(file.url)) return;
    seen.add(file.url);
    const url = publicFalFileUrl(file);
    if (url) {
      await ctx.addAttachment({ type: 'url', url, mimeType: file.content_type ?? undefined });
      return;
    }
    const inline = decodeInlineFile(file.url);
    await ctx.addAttachment({
      type: 'content',
      content: new Response(Uint8Array.from(inline.bytes)),
      mimeType: file.content_type ?? inline.mimeType,
      filename: file.file_name ?? undefined
    });
  };
  const visit = async (value: unknown, key?: string): Promise<unknown> => {
    if (Array.isArray(value)) {
      const items: unknown[] = [];
      for (const item of value) items.push(await visit(item, key));
      return items;
    }
    if (
      typeof value === 'string' &&
      (/^data:[^,]+,/.test(value) ||
        (key && /^(?:image|video|audio|mesh|model)_urls?$/.test(key)) ||
        (key && /^(?:image|video|audio|mesh)s?$/.test(key) && /^https?:\/\//.test(value)))
    ) {
      const file = requireFalFile(value, key?.replace(/_urls?$/, '') ?? 'file');
      await addFile(file);
      if (publicFalFileUrl(file)) return value;
      return { content_type: file.content_type, file_size: file.file_size };
    }
    if (!value || typeof value !== 'object') return value;
    if ('url' in value) {
      const parsed = falFileSchema.safeParse(value);
      if (!parsed.success) {
        if (['content_type', 'file_name', 'file_size'].some(field => field in value))
          requireFalFile(value, 'file');
      } else {
        const file = requireFalFile(value, 'file');
        await addFile(file);
        const metadata: Record<string, unknown> = { ...value, ...file };
        const output: Record<string, unknown> = {};
        for (const [childKey, child] of Object.entries(metadata)) {
          if (childKey === 'url' && !publicFalFileUrl(file)) continue;
          output[childKey] = await visit(child, childKey);
        }
        return output;
      }
    }
    const output: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value))
      output[childKey] = await visit(child, childKey);
    return output;
  };
  return await visit(result);
};
