import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  escapeTelegramHtml,
  telegramHtmlLink as link,
  markdownToTelegramHtml,
  tableToAscii
} from '@slates/adapter-chat';

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToTelegramHtml(part.markdown);
    case 'text': {
      let content = escapeTelegramHtml(part.content);
      if (part.style === 'bold') return `<b>${content}</b>`;
      if (part.style === 'muted') return `<i>${content}</i>`;
      return content;
    }
    case 'image':
      return link(part.url, escapeTelegramHtml(part.alt || part.url));
    case 'divider':
      return '———';
    case 'link':
      return link(part.url, escapeTelegramHtml(part.label));
    case 'fields':
      return part.children
        .map(
          field =>
            `<b>${escapeTelegramHtml(field.label)}</b>: ${escapeTelegramHtml(field.value)}`
        )
        .join('\n');
    case 'table': {
      let table = `<pre>${escapeTelegramHtml(tableToAscii(part.headers, part.rows))}</pre>`;
      return part.caption ? `<b>${escapeTelegramHtml(part.caption)}</b>\n${table}` : table;
    }
    case 'chart': {
      let [title, ...data] = chartToAltText(part).split('\n');
      return `<b>${escapeTelegramHtml(title ?? part.title)}</b>\n<pre>${escapeTelegramHtml(data.join('\n'))}</pre>`;
    }
    case 'section':
      return renderParts(part.children);
    case 'card': {
      let lines: string[] = [];
      if (part.title) lines.push(`<b>${escapeTelegramHtml(part.title)}</b>`);
      if (part.subtitle) lines.push(`<i>${escapeTelegramHtml(part.subtitle)}</i>`);
      if (part.imageUrl) lines.push(link(part.imageUrl, escapeTelegramHtml(part.imageUrl)));
      let children = renderParts(part.children);
      if (children) lines.push(children);
      return lines.join('\n');
    }
  }
};

let renderParts = (parts: ChatPart[]) => parts.map(renderPart).filter(Boolean).join('\n\n');

export let renderTelegramBody = (body: Pick<ChatBody, 'parts'>, action: string) => {
  let text = renderParts(body.parts).trim();
  if (!text) {
    throw ChatErrors.contentEmpty({ action, message: 'The message has no text to send.' });
  }
  return { text, parseMode: 'HTML' as const };
};

// Files are sent as their own messages through file upload.
export let rejectInlineAttachments = (body: Pick<ChatBody, 'attachments'>, action: string) => {
  if (!body.attachments?.length) return;
  throw ChatErrors.capabilityUnsupported({
    action,
    capability: 'file_upload',
    message:
      'Telegram sends each file as its own message. Upload files with metorial_chat$file.upload and send text separately.'
  });
};
