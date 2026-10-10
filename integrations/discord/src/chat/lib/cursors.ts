import { decodeChatCursor, encodeCursor, type PageDirection } from '@slates/adapter-chat';
import { z } from 'zod';

let PROVIDER = 'discord';

export let encodeDiscordCursor = <Data>(direction: PageDirection, data: Data) =>
  encodeCursor(PROVIDER, { direction, data });

export let decodeDiscordCursor = <Data>(
  cursor: string | undefined,
  fallbackDirection: PageDirection,
  schema: z.ZodType<Data>,
  action: string
): { direction: PageDirection; data: Data | undefined } => {
  if (!cursor) return { direction: fallbackDirection, data: undefined };

  let decoded = decodeChatCursor(PROVIDER, cursor, schema, {
    action,
    message: 'The cursor is not a valid Discord page cursor. Request the first page again.'
  });
  return { direction: decoded.direction, data: decoded.data };
};

export let snowflakeCursorSchema = z.object({ id: z.string().regex(/^\d+$/) });
export let offsetCursorSchema = z.object({ offset: z.number().int().nonnegative() });
