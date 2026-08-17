import { z } from 'zod';

export let pageDirectionSchema = z.enum(['backward', 'forward']);

export type PageDirection = z.infer<typeof pageDirectionSchema>;

export let chatCursorSchema = z.object({
  provider: z.string(),
  direction: pageDirectionSchema,
  data: z.unknown()
});

export type ChatCursor<Data = unknown> = {
  provider: string;
  direction: PageDirection;
  data: Data;
};

export let encodeCursor = <Data>(cursor: ChatCursor<Data>): string =>
  JSON.stringify({
    provider: cursor.provider,
    direction: cursor.direction,
    data: cursor.data
  });

export let decodeCursor = <Data = unknown>(
  cursor: string,
  dataSchema?: z.ZodType<Data>
): ChatCursor<Data> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(cursor);
  } catch {
    throw new Error('Chat cursor is not valid JSON');
  }

  let value = chatCursorSchema.parse(parsed);
  return {
    provider: value.provider,
    direction: value.direction,
    data: dataSchema ? dataSchema.parse(value.data) : (value.data as Data)
  };
};

export let cursorPageSchema = z.object({
  cursor: z.string().optional().describe('Opaque cursor from a previous page'),
  limit: z.number().int().positive().max(100).optional(),
  direction: pageDirectionSchema
    .optional()
    .describe(
      'backward = older/previous (default for messages), forward = newer/next. Omit with no cursor to get the first page.'
    )
});

export type CursorPage = z.infer<typeof cursorPageSchema>;

export let cursorPageResultSchema = z.object({
  nextCursor: z
    .string()
    .optional()
    .describe('More items in the requested direction. Omit when that side is exhausted.'),
  prevCursor: z
    .string()
    .optional()
    .describe(
      'Items in the opposite direction from this page. Omit if the platform cannot reverse or there are none.'
    )
});

export type CursorPageResult = z.infer<typeof cursorPageResultSchema>;
