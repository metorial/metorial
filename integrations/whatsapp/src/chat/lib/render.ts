import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  parseMarkdown,
  tableToAscii,
  toPlainText
} from '@slates/adapter-chat';

/**
 * Renders normalized chat parts to a WhatsApp text body.
 *
 * WhatsApp text supports `*bold*`, `_italic_`, `~strikethrough~`, `` `inline code` ``,
 * ```` ```monospace``` ````, `- ` / `1. ` lists, and `> ` quotes. Structures WhatsApp
 * cannot render natively (tables, charts, fields, cards) use explicit plain-text
 * fallbacks rather than being dropped.
 * https://whatsapp.com/faq/en/general/26000002
 */

// https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages
export let WHATSAPP_TEXT_MAX_LENGTH = 4096;

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  identifier?: string;
  ordered?: boolean | null;
  start?: number | null;
  checked?: boolean | null;
  children?: MdNode[];
};

/** Places a WhatsApp style marker tightly around content; WhatsApp ignores markers next to spaces. */
let wrap = (marker: string, content: string) => {
  let match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
  let [, leading = '', inner = '', trailing = ''] = match ?? [];
  if (!inner) return content;
  return `${leading}${marker}${inner}${marker}${trailing}`;
};

let renderInline = (nodes: MdNode[] | undefined): string =>
  (nodes ?? []).map(renderInlineNode).join('');

let renderInlineNode = (node: MdNode): string => {
  switch (node.type) {
    case 'text':
      return node.value ?? '';
    case 'strong':
      return wrap('*', renderInline(node.children));
    case 'emphasis':
      return wrap('_', renderInline(node.children));
    case 'delete':
      return wrap('~', renderInline(node.children));
    case 'inlineCode':
      return node.value ? `\`${node.value}\`` : '';
    case 'break':
      return '\n';
    case 'link': {
      let label = renderInline(node.children).trim();
      let url = node.url ?? '';
      if (!label || label === url) return url;
      return `${label} (${url})`;
    }
    case 'image': {
      let url = node.url ?? '';
      return node.alt ? `${node.alt} (${url})` : url;
    }
    case 'imageReference':
      return node.alt ?? '';
    case 'footnoteReference':
      return `[${node.identifier ?? ''}]`;
    case 'html':
      return node.value ?? '';
    default:
      return node.children ? renderInline(node.children) : (node.value ?? '');
  }
};

let prefixLines = (text: string, first: string, rest: string) =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? first : rest) + line)
    .join('\n');

let renderBlocks = (nodes: MdNode[] | undefined): string =>
  (nodes ?? [])
    .map(renderBlockNode)
    .filter(block => block.length > 0)
    .join('\n\n');

let renderList = (node: MdNode): string => {
  let start = typeof node.start === 'number' ? node.start : 1;
  return (node.children ?? [])
    .map((item, index) => {
      let marker = node.ordered ? `${start + index}. ` : '- ';
      let task = item.checked === true ? '[x] ' : item.checked === false ? '[ ] ' : '';
      let content = (item.children ?? [])
        .map(child => (child.type === 'list' ? renderList(child) : renderBlockNode(child)))
        .filter(Boolean)
        .join('\n');
      return prefixLines(`${task}${content}`, marker, ' '.repeat(marker.length));
    })
    .join('\n');
};

let renderTableNode = (node: MdNode) => {
  let rows = (node.children ?? []).map(row =>
    (row.children ?? []).map(cell => toPlainText(renderInline(cell.children)))
  );
  let [headers = [], ...body] = rows;
  return `\`\`\`\n${tableToAscii(headers, body)}\n\`\`\``;
};

let renderBlockNode = (node: MdNode): string => {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.children);
    case 'heading':
      return wrap('*', renderInline(node.children));
    case 'blockquote':
      return prefixLines(renderBlocks(node.children), '> ', '> ');
    case 'list':
      return renderList(node);
    case 'code':
      return `\`\`\`\n${node.value ?? ''}\n\`\`\``;
    case 'thematicBreak':
      return '———';
    case 'table':
      return renderTableNode(node);
    case 'html':
      return node.value ?? '';
    case 'definition':
      return '';
    case 'footnoteDefinition':
      return `[${node.identifier ?? ''}] ${renderBlocks(node.children)}`;
    default:
      return node.children ? renderBlocks(node.children) : (node.value ?? '');
  }
};

export let markdownToWhatsApp = (markdown: string) => {
  let root = parseMarkdown(markdown) as unknown as MdNode;
  return renderBlocks(root.children).trim();
};

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToWhatsApp(part.markdown);
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

  // WhatsApp counts characters; Array.from counts code points rather than UTF-16 units.
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
