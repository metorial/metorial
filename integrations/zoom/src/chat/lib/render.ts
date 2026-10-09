import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  parseMarkdown,
  tableToAscii
} from '@slates/adapter-chat';

/**
 * Renders the shared parts document into a Zoom chatbot message card with
 * `is_markdown_support: true`.
 *
 * Card structure: https://developers.zoom.us/docs/chat/customizing-messages/
 * Markdown syntax: https://developers.zoom.us/docs/chat/customizing-messages/markdown/
 * (bold `**x**`, italic `_x_`, strikethrough `~x~`, monospace `` `x` ``,
 * block quote `> x`, links `<https://...>`, images `<img:url|alt>`, and a
 * backslash escapes markdown characters).
 */

type ZoomMessageItem = { type: 'message'; text: string };
type ZoomFieldsItem = {
  type: 'fields';
  items: Array<{ key: string; value: string; editable: false }>;
};
type ZoomSectionItem = {
  type: 'section';
  sections: Array<ZoomMessageItem | ZoomFieldsItem>;
};
type ZoomBodyItem = ZoomMessageItem | ZoomFieldsItem | ZoomSectionItem;

export interface ZoomChatbotContent {
  body: ZoomBodyItem[];
}

export interface RenderedZoomMessage {
  content: ZoomChatbotContent;
  isMarkdown: true;
}

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  depth?: number;
  ordered?: boolean | null;
  start?: number | null;
  children?: MdNode[];
}

let escapeZoom = (value: string) =>
  value.replace(/([\\*_~`<])/g, '\\$1').replace(/^(\s*)>/gm, '$1\\>');

/**
 * Only http(s) URLs are placed inside `<...>` markup, with the delimiter
 * characters percent-encoded so a URL cannot close the token early.
 */
let safeUrl = (url: string, action: string) => {
  let trimmed = url.trim();
  let parsed: URL | undefined;
  try {
    parsed = new URL(trimmed);
  } catch {}
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    throw ChatErrors.inputInvalid({
      action,
      message: `Zoom chatbot messages only support http(s) links and images: ${trimmed}`
    });
  }
  return trimmed.replace(/[<>|\s]/g, char => encodeURIComponent(char));
};

let zoomLink = (url: string, label: string | undefined, action: string) => {
  let href = safeUrl(url, action);
  let trimmed = label?.trim();
  if (!trimmed || trimmed === url.trim()) return `<${href}>`;
  return `${escapeZoom(trimmed)} <${href}>`;
};

let zoomImage = (url: string, alt: string | null | undefined, action: string) =>
  `<img:${safeUrl(url, action)}${alt?.trim() ? `|${alt.trim().replace(/[|<>]/g, ' ')}` : ''}>`;

let monospaceLines = (text: string) =>
  text
    .split('\n')
    .map(line => (line ? `\`${line.replace(/`/g, '\\`')}\`` : ''))
    .join('\n');

let quoteLines = (text: string) =>
  text
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');

let plainText = (node: MdNode): string => {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(plainText).join('');
};

let renderInline = (nodes: MdNode[] | undefined, action: string): string =>
  (nodes ?? []).map(node => renderInlineNode(node, action)).join('');

let renderInlineNode = (node: MdNode, action: string): string => {
  switch (node.type) {
    case 'text':
      return escapeZoom(node.value ?? '');
    case 'strong':
      return `**${renderInline(node.children, action)}**`;
    case 'emphasis':
      return `_${renderInline(node.children, action)}_`;
    case 'delete':
      return `~${renderInline(node.children, action)}~`;
    case 'inlineCode':
      return monospaceLines(node.value ?? '');
    case 'break':
      return '\n';
    case 'link':
      return zoomLink(node.url ?? '', plainText(node), action);
    case 'image':
      return zoomImage(node.url ?? '', node.alt, action);
    case 'html':
      return escapeZoom(node.value ?? '');
    default:
      return node.children
        ? renderInline(node.children, action)
        : escapeZoom(node.value ?? '');
  }
};

let renderBlock = (node: MdNode, action: string): string => {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.children, action);
    case 'heading':
      return `**${renderInline(node.children, action)}**`;
    case 'blockquote':
      return quoteLines(renderBlocks(node.children, action));
    case 'code':
      return monospaceLines(node.value ?? '');
    case 'list': {
      let start = typeof node.start === 'number' ? node.start : 1;
      return (node.children ?? [])
        .map((item, index) => {
          let marker = node.ordered ? `${start + index}.` : '•';
          let content = renderBlocks(item.children, action).replace(/\n/g, '\n   ');
          return `${marker} ${content}`;
        })
        .join('\n');
    }
    case 'thematicBreak':
      return '---';
    case 'table': {
      let rows = (node.children ?? []).map(row =>
        (row.children ?? []).map(cell => plainText(cell))
      );
      let [headers = [], ...body] = rows;
      return monospaceLines(tableToAscii(headers, body));
    }
    case 'html':
      return escapeZoom(node.value ?? '');
    default:
      return node.children
        ? renderInline(node.children, action)
        : escapeZoom(node.value ?? '');
  }
};

let renderBlocks = (nodes: MdNode[] | undefined, action: string) =>
  (nodes ?? [])
    .map(node => renderBlock(node, action))
    .filter(text => text.length > 0)
    .join('\n\n');

export let markdownToZoom = (markdown: string, action = 'metorial_chat$message.send') =>
  renderBlocks((parseMarkdown(markdown) as unknown as MdNode).children, action);

let textItem = (text: string): ZoomMessageItem => ({ type: 'message', text });

let renderPartItems = (
  part: ChatPart,
  action: string
): Array<ZoomMessageItem | ZoomFieldsItem> => {
  switch (part.type) {
    case 'markdown': {
      let text = markdownToZoom(part.markdown, action);
      return text ? [textItem(text)] : [];
    }
    case 'text': {
      let content = escapeZoom(part.content);
      if (!content) return [];
      if (part.style === 'bold') return [textItem(`**${content}**`)];
      if (part.style === 'muted') return [textItem(`_${content}_`)];
      return [textItem(content)];
    }
    case 'image':
      return [textItem(zoomImage(part.url, part.alt, action))];
    case 'divider':
      return [textItem('---')];
    case 'link':
      return [textItem(zoomLink(part.url, part.label, action))];
    case 'fields':
      return part.children.length
        ? [
            {
              type: 'fields',
              items: part.children.map(child => ({
                key: child.label,
                value: escapeZoom(child.value),
                editable: false as const
              }))
            }
          ]
        : [];
    case 'table': {
      let table = monospaceLines(tableToAscii(part.headers, part.rows));
      return [textItem(part.caption ? `**${escapeZoom(part.caption)}**\n${table}` : table)];
    }
    case 'chart':
      return [textItem(monospaceLines(chartToAltText(part)))];
    case 'section':
      return part.children.flatMap(child => renderPartItems(child, action));
    case 'card': {
      let items: Array<ZoomMessageItem | ZoomFieldsItem> = [];
      if (part.title) items.push(textItem(`**${escapeZoom(part.title)}**`));
      if (part.subtitle) items.push(textItem(`_${escapeZoom(part.subtitle)}_`));
      if (part.imageUrl) items.push(textItem(zoomImage(part.imageUrl, undefined, action)));
      items.push(...part.children.flatMap(child => renderPartItems(child, action)));
      return items;
    }
    default:
      throw ChatErrors.unsupportedBlock({
        action,
        message: `Unsupported message part type: ${(part as { type?: string }).type}`
      });
  }
};

export let renderZoomBody = (body: ChatBody, action: string): RenderedZoomMessage => {
  if (body.attachments?.length) {
    throw ChatErrors.attachmentUnsupportedType({
      action,
      message:
        'Zoom chatbot messages cannot carry file attachments; send an image or link part instead.'
    });
  }

  let items: ZoomBodyItem[] = body.parts.flatMap((part): ZoomBodyItem[] => {
    if (part.type === 'section' || part.type === 'card') {
      let sections = renderPartItems(part, action);
      return sections.length ? [{ type: 'section', sections }] : [];
    }
    return renderPartItems(part, action);
  });

  if (items.length === 0) {
    let fallback = body.altText?.trim();
    if (!fallback) throw ChatErrors.contentEmpty({ action });
    items = [textItem(escapeZoom(fallback))];
  }

  return { content: { body: items }, isMarkdown: true };
};
