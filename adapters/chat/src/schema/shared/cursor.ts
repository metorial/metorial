import { z } from 'zod';
import { ChatErrors } from '../../errors/factories';

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

export let encodeCursor = <Data>(
  provider: string,
  cursor: Omit<ChatCursor<Data>, 'provider'>
): string =>
  JSON.stringify({
    provider,
    direction: cursor.direction,
    data: cursor.data
  });

export let decodeCursor = <Data = unknown>(
  provider: string,
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
  if (value.provider !== provider)
    throw new Error(`Chat cursor belongs to ${value.provider}, not ${provider}`);

  return {
    provider: value.provider,
    direction: value.direction,
    data: dataSchema ? dataSchema.parse(value.data) : (value.data as Data)
  };
};

/** `decodeCursor` that reports a malformed or foreign cursor as `chat.input.cursor_invalid`. */
export let decodeChatCursor = <Data = unknown>(
  provider: string,
  cursor: string,
  dataSchema: z.ZodType<Data>,
  options: { action: string; message?: string }
): ChatCursor<Data> => {
  try {
    return decodeCursor(provider, cursor, dataSchema);
  } catch (error) {
    throw ChatErrors.cursorInvalid({
      action: options.action,
      message: options.message,
      cause: error
    });
  }
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
