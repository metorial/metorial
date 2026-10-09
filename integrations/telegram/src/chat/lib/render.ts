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
 * Renders a chat body into Telegram's HTML parse mode.
 * https://core.telegram.org/bots/api#html-style
 */

type MdNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  lang?: string | null;
  ordered?: boolean | null;
  start?: number | null;
  checked?: boolean | null;
  children?: MdNode[];
};

/** Telegram requires `<`, `>` and `&` outside tags to be escaped. */
export let escapeTelegramHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let escapeAttribute = (value: string) => escapeTelegramHtml(value).replace(/"/g, '&quot;');

let link = (url: string, label: string) => `<a href="${escapeAttribute(url)}">${label}</a>`;

let renderInline = (nodes: MdNode[] = []): string =>
  nodes
    .map(node => {
      switch (node.type) {
        case 'text':
          return escapeTelegramHtml(node.value ?? '');
        case 'strong':
          return `<b>${renderInline(node.children)}</b>`;
        case 'emphasis':
          return `<i>${renderInline(node.children)}</i>`;
        case 'delete':
          return `<s>${renderInline(node.children)}</s>`;
        case 'inlineCode':
          return `<code>${escapeTelegramHtml(node.value ?? '')}</code>`;
        case 'link':
          return link(
            node.url ?? '',
            renderInline(node.children) || escapeTelegramHtml(node.url ?? '')
          );
        case 'image':
          return link(node.url ?? '', escapeTelegramHtml(node.alt || node.url || ''));
        case 'break':
          return '\n';
        case 'html':
          return escapeTelegramHtml(node.value ?? '');
        default:
          return node.children
            ? renderInline(node.children)
            : escapeTelegramHtml(node.value ?? '');
      }
    })
    .join('');

let cellText = (node: MdNode) =>
  toPlainText({ type: 'root', children: node.children ?? [] } as any);

let renderList = (node: MdNode, depth: number): string => {
  let start = node.start ?? 1;
  return (node.children ?? [])
    .map((item, index) => {
      let marker = node.ordered
        ? `${start + index}.`
        : item.checked === true
          ? '☑'
          : item.checked === false
            ? '☐'
            : '•';
      let indent = '  '.repeat(depth);
      let blocks = (item.children ?? []).map(child =>
        child.type === 'list' ? renderList(child, depth + 1) : renderBlock(child, depth + 1)
      );
      let [first = '', ...rest] = blocks;
      return [`${indent}${marker} ${first}`, ...rest].join('\n');
    })
    .join('\n');
};

let renderBlock = (node: MdNode, depth = 0): string => {
  switch (node.type) {
    case 'root':
      return renderBlocks(node.children);
    case 'paragraph':
      return renderInline(node.children);
    case 'heading':
      return `<b>${renderInline(node.children)}</b>`;
    case 'blockquote':
      return `<blockquote>${renderBlocks(node.children)}</blockquote>`;
    case 'code': {
      let language = node.lang ? ` class="language-${escapeAttribute(node.lang)}"` : '';
      return `<pre><code${language}>${escapeTelegramHtml(node.value ?? '')}</code></pre>`;
    }
    case 'list':
      return renderList(node, depth);
    case 'thematicBreak':
      return '———';
    case 'table': {
      let [header, ...rows] = (node.children ?? []).map(row =>
        (row.children ?? []).map(cellText)
      );
      return `<pre>${escapeTelegramHtml(tableToAscii(header ?? [], rows))}</pre>`;
    }
    case 'html':
      return escapeTelegramHtml(node.value ?? '');
    default:
      return node.children
        ? renderInline(node.children)
        : escapeTelegramHtml(node.value ?? '');
  }
};

let renderBlocks = (nodes: MdNode[] = []) =>
  nodes
    .map(node => renderBlock(node))
    .filter(Boolean)
    .join('\n\n');

export let renderTelegramMarkdown = (markdown: string) =>
  renderBlock(parseMarkdown(markdown) as unknown as MdNode);

let renderPart = (part: ChatPart): string => {
  switch (part.type) {
    case 'markdown':
      return renderTelegramMarkdown(part.markdown);
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

/** Telegram attaches files by sending them as their own messages through file upload. */
export let rejectInlineAttachments = (body: Pick<ChatBody, 'attachments'>, action: string) => {
  if (!body.attachments?.length) return;
  throw ChatErrors.capabilityUnsupported({
    action,
    capability: 'file_upload',
    message:
      'Telegram sends each file as its own message. Upload files with metorial_chat$file.upload and send text separately.'
  });
};
