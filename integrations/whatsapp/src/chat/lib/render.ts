import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  markdownToWhatsAppText,
  tableToAscii,
  wrapWhatsAppMarker as wrap
} from '@slates/adapter-chat';

// https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages
export let WHATSAPP_TEXT_MAX_LENGTH = 4096;

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToWhatsAppText(part.markdown);
    case 'text':
      if (part.style === 'bold') return wrap('*', part.content);
      if (part.style === 'muted') return wrap('_', part.content);
      return part.content;
    case 'image':
      return part.alt ? `${part.alt}: ${part.url}` : part.url;
    case 'divider':
      return '———';
    case 'link':
      return part.label && part.label !== part.url ? `${part.label}: ${part.url}` : part.url;
    case 'fields':
      return part.children
        .map(field => `${wrap('*', `${field.label}:`)} ${field.value}`)
        .join('\n');
    case 'table': {
      let table = `\`\`\`\n${tableToAscii(part.headers, part.rows)}\n\`\`\``;
      return part.caption ? `${part.caption}\n${table}` : table;
    }
    case 'chart':
      return `\`\`\`\n${chartToAltText(part)}\n\`\`\``;
    case 'section':
      return renderParts(part.children);
    case 'card': {
      let lines: string[] = [];
      if (part.title) lines.push(wrap('*', part.title));
      if (part.subtitle) lines.push(wrap('_', part.subtitle));
      if (part.imageUrl) lines.push(part.imageUrl);
      let children = renderParts(part.children);
      if (children) lines.push(children);
      return lines.join('\n');
    }
    default:
      return '';
  }
};

let renderParts = (parts: ChatPart[]): string =>
  parts
    .map(renderPart)
    .map(text => text.trim())
    .filter(text => text.length > 0)
    .join('\n\n');

export let renderWhatsAppText = (body: Pick<ChatBody, 'parts'>, action: string) => {
  let text = renderParts(body.parts);
  if (!text) {
    throw ChatErrors.contentEmpty({ action });
  }

  // WhatsApp counts code points, not UTF-16 units.
  let length = Array.from(text).length;
  if (length > WHATSAPP_TEXT_MAX_LENGTH) {
    throw ChatErrors.contentTooLong({
      action,
      max: WHATSAPP_TEXT_MAX_LENGTH,
      actual: length
    });
  }

  return text;
};
