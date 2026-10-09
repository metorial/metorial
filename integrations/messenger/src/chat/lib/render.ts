import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  cardToAltText,
  chartToAltText,
  parseMarkdown,
  tablePartToAltText
} from '@slates/adapter-chat';

/** Messenger text messages must be UTF-8 and under 2000 characters (Send API reference). */
export let MESSENGER_TEXT_LIMIT = 2000;

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  ordered?: boolean | null;
  start?: number | null;
  children?: MarkdownNode[];
}

let inline = (nodes: MarkdownNode[] | undefined): string =>
  (nodes ?? []).map(renderInline).join('');

let renderInline = (node: MarkdownNode): string => {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
    case 'html':
      return node.value ?? '';
    case 'break':
      return '\n';
    case 'link': {
      let label = inline(node.children);
      let url = node.url ?? '';
      return !label || label === url ? url : `${label} (${url})`;
    }
    case 'image':
      return node.alt ? `${node.alt} (${node.url ?? ''})` : (node.url ?? '');
    default:
      return inline(node.children);
  }
};

let renderBlock = (node: MarkdownNode): string => {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return inline(node.children);
    case 'code':
      return node.value ?? '';
    case 'thematicBreak':
      return '---';
    case 'blockquote':
      return renderBlocks(node.children)
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
    case 'list': {
      let start = node.start ?? 1;
      return (node.children ?? [])
        .map((item, index) => {
          let marker = node.ordered ? `${start + index}.` : '-';
          let content = renderBlocks(item.children).split('\n');
          return [
            `${marker} ${content[0] ?? ''}`,
            ...content.slice(1).map(line => `  ${line}`)
          ].join('\n');
        })
        .join('\n');
    }
    case 'table':
      return (node.children ?? [])
        .map(row => (row.children ?? []).map(cell => inline(cell.children)).join(' | '))
        .join('\n');
    case 'html':
      return node.value ?? '';
    default:
      return node.children ? renderBlocks(node.children) : renderInline(node);
  }
};

let renderBlocks = (nodes: MarkdownNode[] | undefined) =>
  (nodes ?? [])
    .map(renderBlock)
    .filter(text => text.length > 0)
    .join('\n\n');

/** Messenger renders text literally, so markdown is flattened while keeping link targets. */
export let markdownToMessengerText = (markdown: string) =>
  renderBlocks((parseMarkdown(markdown) as unknown as MarkdownNode).children).trim();

let renderPart = (part: ChatPart, action: string): string => {
  switch (part.type) {
    case 'markdown':
      return markdownToMessengerText(part.markdown);
    case 'text':
      return part.content;
    case 'link':
      return part.label && part.label !== part.url ? `${part.label} (${part.url})` : part.url;
    case 'divider':
      return '---';
    case 'fields':
      return part.children.map(child => `${child.label}: ${child.value}`).join('\n');
    case 'table':
      return tablePartToAltText(part);
    case 'chart':
      return chartToAltText(part);
    case 'section':
      return part.children
        .map(child => renderPart(child, action))
        .filter(Boolean)
        .join('\n');
    case 'card':
      if (part.imageUrl) {
        throw ChatErrors.unsupportedBlock({
          action,
          message:
            'Messenger text messages cannot display card images. Remove imageUrl or send the image as a file.'
        });
      }
      return (
        cardToAltText({ ...part, children: [] }) +
        (part.children.length
          ? `${part.title || part.subtitle ? '\n' : ''}${part.children
              .map(child => renderPart(child, action))
              .filter(Boolean)
              .join('\n')}`
          : '')
      );
    case 'image':
      throw ChatErrors.unsupportedBlock({
        action,
        message:
          'Messenger text messages cannot display inline images. Send the image as a file instead.'
      });
  }
};

/**
 * Renders a chat body to one Messenger text message. Parts Messenger cannot show
 * in text (inline images) are rejected rather than dropped; tables, charts, and
 * fields use the shared plain-text fallbacks.
 */
export let renderMessengerText = (body: Pick<ChatBody, 'parts'>, action: string) => {
  let text = body.parts
    .map(part => renderPart(part, action))
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!text) {
    throw ChatErrors.contentEmpty({ action, message: 'The message has no text to send.' });
  }

  let length = [...text].length;
  if (length >= MESSENGER_TEXT_LIMIT) {
    throw ChatErrors.contentTooLong({
      action,
      max: MESSENGER_TEXT_LIMIT - 1,
      actual: length
    });
  }

  return text;
};
