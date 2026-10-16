import { createApiServiceError, isApiErrorRecord } from 'slates';

export let getEventName = (name: unknown): string => {
  if (isApiErrorRecord(name)) {
    let html = typeof name.html === 'string' ? name.html : undefined;
    let text = typeof name.text === 'string' ? name.text : undefined;
    if (html) return html;
    if (text !== undefined) return text;
    if (html !== undefined) return html;
  }
  throw createApiServiceError(
    'Eventbrite returned an event without a valid name.html or name.text string.',
    { reason: 'eventbrite_invalid_response' }
  );
};
