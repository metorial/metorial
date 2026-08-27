import { decodeCursor, encodeCursor, type PageDirection } from '@slates/adapter-chat';
import { z } from 'zod';

export let slackCursorDataSchema = z
  .object({
    cursor: z.string().min(1).optional(),
    page: z.number().int().nonnegative().optional(),
    timestamp: z.string().min(1).optional()
  })
  .strict();

export type SlackCursorData = z.infer<typeof slackCursorDataSchema>;

export let decodeSlackCursor = (
  cursor: string | undefined,
  direction: PageDirection = 'backward'
) => {
  if (!cursor) return { direction, data: {} as SlackCursorData };
  let decoded = decodeCursor('slack', cursor, slackCursorDataSchema);
  return { direction: decoded.direction, data: decoded.data };
};

export let encodeSlackCursor = (direction: PageDirection, data: SlackCursorData) =>
  encodeCursor('slack', { direction, data: slackCursorDataSchema.parse(data) });
