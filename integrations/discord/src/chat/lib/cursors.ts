import {
  ChatErrors,
  decodeCursor,
  encodeCursor,
  type PageDirection
} from '@slates/adapter-chat';
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

  try {
    let decoded = decodeCursor(PROVIDER, cursor, schema);
    return { direction: decoded.direction, data: decoded.data };
  } catch (error) {
    throw ChatErrors.cursorInvalid({
      action,
      cause: error,
      message: 'The cursor is not a valid Discord page cursor. Request the first page again.'
    });
  }
};

export let snowflakeCursorSchema = z.object({ id: z.string().regex(/^\d+$/) });
export let offsetCursorSchema = z.object({ offset: z.number().int().nonnegative() });
