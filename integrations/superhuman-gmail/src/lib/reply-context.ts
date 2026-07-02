import { extractHeader, type GmailMessage, type ParsedMessage, parseMessage } from './client';

export let buildReplyHeaders = (
  parentMessage: GmailMessage
): { inReplyTo: string; references: string } => {
  let parsed = parseMessage(parentMessage);
  let mid = parsed.mimeMessageId?.trim();
  if (!mid) {
    throw new Error(
      'Parent message is missing a Message-ID header; cannot build a threaded reply.'
    );
  }
  let prevRefs = (parsed.references || '').trim();
  let references = prevRefs ? `${prevRefs} ${mid}` : mid;
  return { inReplyTo: mid, references };
};

export let defaultReplySubject = (subject: string | undefined): string => {
  let s = (subject || '').trim();
  if (!s) return 'Re: (no subject)';
  if (/^re:\s*/i.test(s)) return s;
  return `Re: ${s}`;
};

export let defaultReplyTo = (parsed: ParsedMessage): string[] => {
  let replyTo = parsed.replyTo?.trim();
  if (replyTo) {
    return [replyTo];
  }
  let from = parsed.from?.trim();
  if (from) {
    return [from];
  }
  return [];
};

export let sortMessagesChronological = (messages: ParsedMessage[]): ParsedMessage[] => {
  return [...messages].sort((a, b) => {
    let ta = Number(a.internalDate) || 0;
    let tb = Number(b.internalDate) || 0;
    return ta - tb;
  });
};

export let pickReplyTarget = (
  threadMessages: GmailMessage[],
  replyToMessageId?: string
): GmailMessage => {
  let list = threadMessages || [];
  if (list.length === 0) {
    throw new Error('Thread has no messages.');
  }
  if (replyToMessageId) {
    let found = list.find(m => m.id === replyToMessageId);
    if (!found) {
      throw new Error(`Message ${replyToMessageId} not found in this thread.`);
    }
    return found;
  }
  let parsed = list.map(parseMessage);
  let sorted = sortMessagesChronological(parsed);
  let last = sorted[sorted.length - 1];
  if (!last) {
    throw new Error('Could not resolve latest message in thread.');
  }
  let lastRaw = list.find(m => m.id === last.messageId);
  if (!lastRaw) {
    throw new Error('Could not resolve latest message in thread.');
  }
  return lastRaw;
};

export let extractReplyToFromRaw = (message: GmailMessage): string | undefined => {
  return extractHeader(message, 'Reply-To') || extractHeader(message, 'From');
};
