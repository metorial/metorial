import { z } from 'zod';

export const interactionDatesOutput = z.object({
  firstEmail: z.string().nullable().optional(),
  lastEmail: z.string().nullable().optional(),
  firstEvent: z.string().nullable().optional(),
  lastEvent: z.string().nullable().optional(),
  lastChat: z.string().nullable().optional(),
  lastInteraction: z.string().nullable().optional(),
  nextEvent: z.string().nullable().optional()
});
export const mapInteractionDates = (
  dates: Record<string, string | null | undefined> | null | undefined
) =>
  dates == null
    ? undefined
    : {
        firstEmail: dates.first_email_date,
        lastEmail: dates.last_email_date,
        firstEvent: dates.first_event_date,
        lastEvent: dates.last_event_date,
        lastChat: dates.last_chat_message_date,
        lastInteraction: dates.last_interaction_date,
        nextEvent: dates.next_event_date
      };
