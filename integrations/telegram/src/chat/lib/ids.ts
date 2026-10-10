import { ChatErrors } from '@slates/adapter-chat';

// Chat IDs may also be an @username.
export let parseTelegramInteger = (value: string, field: string, action: string): number => {
  let trimmed = value.trim();
  let parsed = Number(trimmed);
  if (!/^-?\d+$/.test(trimmed) || !Number.isSafeInteger(parsed)) {
    throw ChatErrors.inputInvalid({
      action,
      message: `${field} must be a Telegram integer ID.`,
      issues: [{ path: [field], code: 'invalid_format', message: 'Expected an integer ID' }]
    });
  }
  return parsed;
};

export let parseOptionalTelegramInteger = (
  value: string | undefined,
  field: string,
  action: string
) =>
  value === undefined || value === '' ? undefined : parseTelegramInteger(value, field, action);

export let assertNoCursor = (cursor: string | undefined, action: string) => {
  if (cursor) {
    throw ChatErrors.cursorInvalid({
      action,
      message: 'This list has a single page; omit the cursor.'
    });
  }
};
