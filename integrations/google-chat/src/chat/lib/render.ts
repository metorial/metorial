import { Buffer } from 'node:buffer';
import {
  type ChatBody,
  ChatErrors,
  type ChatPart,
  chartToAltText,
  parseMarkdown,
  tableToAscii
} from '@slates/adapter-chat';

/**
 * Renders normalized chat bodies to Google Chat's default text syntax
 * (https://developers.google.com/workspace/chat/format-messages): `*bold*`,
 * `_italic_`, `~strike~`, backticks, fenced code blocks, `*`/`-` bullets with
 * four-space nesting, `>` quotes, and `<url|label>` links. Raw `<users/...>`
 * mentions in markdown pass through unchanged. Structures without a native
 * text form (tables, charts, cards) use the shared plain-text fallbacks.
 */

/** "The maximum message size (including any text or cards) is 32,000 bytes." */
export let GOOGLE_CHAT_MAX_MESSAGE_BYTES = 32_000;

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  ordered?: boolean | null;
  start?: number | null;
  children?: MdNode[];
}

let codeBlock = (value: string) => `\`\`\`\n${value.replace(/\n$/, '')}\n\`\`\``;

let link = (url: string, label?: string) => {
  let text = label?.trim();
  if (!text || text === url) return url;
  return `<${url}|${text.replace(/[|>]/g, ' ')}>`;
};

let inline = (nodes: MdNode[] | undefined): string =>
  (nodes ?? []).map(node => inlineNode(node)).join('');

let inlineNode = (node: MdNode): string => {
  switch (node.type) {
    case 'text':
    case 'html':
      return node.value ?? '';
    case 'strong':
      return `*${inline(node.children)}*`;
    case 'emphasis':
      return `_${inline(node.children)}_`;
    case 'delete':
      return `~${inline(node.children)}~`;
    case 'inlineCode':
      return `\`${node.value ?? ''}\``;
    case 'break':
      return '\n';
    case 'link':
      return link(node.url ?? '', inline(node.children));
    case 'image':
      return link(node.url ?? '', node.alt ?? undefined);
    default:
      return node.children ? inline(node.children) : (node.value ?? '');
  }
};

let tableRows = (node: MdNode) =>
  (node.children ?? []).map(row => (row.children ?? []).map(cell => inline(cell.children)));

let listBlock = (node: MdNode, depth: number): string =>
  (node.children ?? [])
    .map((item, index) => {
      let indent = '    '.repeat(depth);
      let marker = node.ordered ? `${(node.start ?? 1) + index}.` : '*';
      let lines: string[] = [];
      for (let child of item.children ?? []) {
        if (child.type === 'list') lines.push(listBlock(child, depth + 1));
        else if (lines.length === 0) lines.push(`${indent}${marker} ${block(child, depth)}`);
        else lines.push(`${indent}    ${block(child, depth)}`);
      }
      return lines.length ? lines.join('\n') : `${indent}${marker}`;
    })
    .join('\n');

let block = (node: MdNode, depth = 0): string => {
  switch (node.type) {
    case 'root':
      return (node.children ?? []).map(child => block(child, depth)).join('\n\n');
    case 'paragraph':
      return inline(node.children);
    case 'heading':
      return `*${inline(node.children)}*`;
    case 'code':
      return codeBlock(node.value ?? '');
    case 'blockquote':
      return (node.children ?? [])
        .map(child => block(child, depth))
        .join('\n')
        .split('\n')
        .map(line => `>${line}`)
        .join('\n');
    case 'list':
      return listBlock(node, depth);
    case 'thematicBreak':
      return '---';
    case 'table': {
      let [headers = [], ...rows] = tableRows(node);
      return codeBlock(tableToAscii(headers, rows));
    }
    case 'html':
      return node.value ?? '';
    default:
      return inlineNode(node);
  }
};

export let markdownToGoogleChatText = (markdown: string) =>
  block(parseMarkdown(markdown) as unknown as MdNode).trim();

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

/**
 * Returns the message text for a body. Google Chat app authentication cannot
 * attach uploaded files to messages, so attachments are rejected instead of
 * being silently dropped.
 */
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
