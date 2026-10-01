import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let conversationStatusDescription =
  'Status code: 0=Open, 1=Responded, 2=Done, 3=Spam, 4=Archived, 5=On Hold, 6=Auto-Done, 7=AI Agent Assigned, 8=AI Agent Done, 9=AI-identified Spam';

export let personSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  id: z.string().nullable().optional()
});

export let mapPerson = (value: unknown): z.infer<typeof personSchema> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  let person = value as Record<string, unknown>;
  let text = (field: unknown) =>
    typeof field === 'string' || field === null ? field : undefined;
  return {
    name: text(person.name),
    email: text(person.email),
    mobile: text(person.mobile),
    id: typeof person.id === 'number' ? String(person.id) : text(person.id)
  };
};

export let mapAssignee = (value: unknown): string | null | undefined => {
  if (typeof value === 'string' || value === null) return value;
  let assignee = mapPerson(value);
  return assignee?.email ?? assignee?.name ?? undefined;
};

let parseDate = (value: string, field: string, allowDate: boolean) => {
  let valid = z.iso.datetime({ offset: true }).safeParse(value).success;
  if (allowDate) valid ||= z.iso.date().safeParse(value).success;
  let timestamp = Date.parse(value);
  if (!valid || !Number.isFinite(timestamp)) {
    throw createApiServiceError(
      `${field} must be ${allowDate ? 'an ISO 8601 date or timestamp' : 'an ISO 8601 timestamp with a timezone'}.`
    );
  }
  return timestamp;
};

export let validateDateRange = (startDate?: string, endDate?: string) => {
  let start = startDate === undefined ? undefined : parseDate(startDate, 'startDate', true);
  let end = endDate === undefined ? undefined : parseDate(endDate, 'endDate', true);
  if (start !== undefined && end !== undefined && start > end) {
    throw createApiServiceError('startDate must be earlier than or equal to endDate.');
  }
};

export let validateHoldUntil = (
  status: number | undefined,
  holdUntil: string | undefined,
  options: { requireStatus?: boolean } = {}
) => {
  if (holdUntil === undefined) return;
  parseDate(holdUntil, 'holdUntil', false);
  if ((status !== undefined || options.requireStatus) && status !== 5) {
    throw createApiServiceError('Set status to 5 (On Hold) when providing holdUntil.');
  }
};

export let validateSuppressSurveys = (value: boolean | string | undefined) => {
  if (typeof value === 'string' && !z.iso.date().safeParse(value).success) {
    throw createApiServiceError(
      'suppressSurveys must be a boolean or a valid date in YYYY-MM-DD format.'
    );
  }
};
