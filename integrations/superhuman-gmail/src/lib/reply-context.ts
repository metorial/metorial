import { createApiServiceError } from 'slates';
import { type GmailMessage, type ParsedMessage, parseMessage } from './client';
import { validateComposeInput } from './mime';

export const buildReplyHeaders = (parent: GmailMessage) => {
  const parsed = parseMessage(parent);
  const mid = parsed.mimeMessageId?.trim();
  if (!mid)
    throw createApiServiceError(
      'The parent has no Message-ID header. Select another message or provide explicit reply headers.'
    );
  const references = parsed.references?.trim() ? `${parsed.references.trim()} ${mid}` : mid;
  validateComposeInput({ inReplyTo: mid, references });
  return { inReplyTo: mid, references };
};
export const defaultReplySubject = (subject?: string) =>
  !subject?.trim()
    ? ''
    : /^re:\s*/i.test(subject.trim())
      ? subject.trim()
      : `Re: ${subject.trim()}`;
export const assertReplySubject = (subject: string, parentSubject?: string) => {
  const normalize = (value: string) => value.replace(/^(?:\s*re:\s*)+/i, '').trim();
  if (normalize(subject) !== normalize(parentSubject ?? ''))
    throw createApiServiceError(
      'A threaded reply must keep the parent subject. Omit subject or use a matching reply subject.'
    );
};
const mailbox = (header: string) =>
  (/<([^<>]+)>/.exec(header)?.[1] ?? header).trim().toLowerCase();
export const defaultReplyTo = (parsed: ParsedMessage, mailboxEmail?: string): string[] => {
  if (parsed.replyTo?.trim()) return [parsed.replyTo.trim()];
  if (parsed.from?.trim()) {
    if (mailboxEmail && mailbox(parsed.from) === mailboxEmail.toLowerCase())
      return parsed.to?.trim() ? [parsed.to.trim()] : [];
    return [parsed.from.trim()];
  }
  return [];
};
export const sortMessagesChronological = (messages: ParsedMessage[]) =>
  [...messages].sort((a, b) => {
    if (a.internalDate === undefined || b.internalDate === undefined) return 0;
    try {
      const left = BigInt(a.internalDate),
        right = BigInt(b.internalDate);
      return left < right ? -1 : left > right ? 1 : 0;
    } catch {
      throw createApiServiceError('Gmail returned an invalid message timestamp.');
    }
  });
export const pickReplyTarget = (
  messages: GmailMessage[],
  messageId?: string
): GmailMessage => {
  if (messageId) {
    const found = messages.find(m => m.id === messageId);
    if (!found)
      throw createApiServiceError('replyToMessageId does not belong to this conversation.');
    if (found.labelIds?.includes('DRAFT'))
      throw createApiServiceError('Select a sent or received message as the reply parent.');
    return found;
  }
  // Drafts are not sent messages and must not become the parent of another reply.
  const candidates = messages.filter(m => !m.labelIds?.includes('DRAFT'));
  const last = sortMessagesChronological(candidates.map(parseMessage)).at(-1);
  const found = candidates.find(m => m.id === last?.messageId);
  if (!found)
    throw createApiServiceError(
      'This conversation has no sent or received message to reply to.'
    );
  return found;
};
