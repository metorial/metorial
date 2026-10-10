import { Buffer } from 'node:buffer';
import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  googleChatCodeBlock as codeBlock,
  googleChatLink as link,
  markdownToGoogleChatText,
  tableToAscii
} from '@slates/adapter-chat';

export let GOOGLE_CHAT_MAX_MESSAGE_BYTES = 32_000;

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToGoogleChatText(part.markdown);
    case 'text':
      if (!part.content) return '';
      if (part.style === 'bold') return `*${part.content}*`;
      if (part.style === 'muted') return `_${part.content}_`;
      return part.content;
    case 'image':
      return link(part.url, part.alt);
    case 'divider':
      return '---';
    case 'link':
      return link(part.url, part.label);
    case 'fields':
      return part.children.map(child => `*${child.label}:* ${child.value}`).join('\n');
    case 'table': {
      let table = codeBlock(tableToAscii(part.headers, part.rows));
      return part.caption ? `${part.caption}\n${table}` : table;
    }
    case 'chart':
      return codeBlock(chartToAltText(part));
    case 'section':
      return part.children.map(renderPart).filter(Boolean).join('\n\n');
    case 'card': {
      let lines: string[] = [];
      if (part.title) lines.push(`*${part.title}*`);
      if (part.subtitle) lines.push(`_${part.subtitle}_`);
      if (part.imageUrl) lines.push(link(part.imageUrl));
      for (let child of part.children) {
        let text = renderPart(child);
        if (text) lines.push(text);
      }
      return lines.join('\n');
    }
  }
};

// App auth cannot attach uploaded files, so attachments are rejected rather than dropped.
export let renderGoogleChatText = (body: ChatBody, action: string) => {
  if (body.attachments?.length) {
    throw ChatErrors.attachmentUnsupportedType({
      action,
      attachmentId: body.attachments[0]?.id,
      message:
        'Google Chat apps cannot attach files to messages with app authentication. Send the file as a link instead.',
      retryable: false
    });
  }

  let text = body.parts.map(renderPart).filter(Boolean).join('\n\n').trim();
  if (!text) text = body.altText?.trim() ?? '';
  if (!text) {
    throw ChatErrors.contentEmpty({ action, message: 'The message has no text to send.' });
  }

  let bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > GOOGLE_CHAT_MAX_MESSAGE_BYTES) {
    throw ChatErrors.contentTooLong({
      action,
      max: GOOGLE_CHAT_MAX_MESSAGE_BYTES,
      actual: bytes,
      message: `Google Chat messages are limited to ${GOOGLE_CHAT_MAX_MESSAGE_BYTES} bytes.`
    });
  }

  return text;
};
