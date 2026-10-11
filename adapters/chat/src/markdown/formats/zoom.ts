import { ChatErrors } from '../../errors/factories';
import { tableToAscii } from '../fallback';
import {
  createMarkdownTextRenderer,
  type MarkdownNode,
  type MarkdownTextRenderer
} from '../walker';

// https://developers.zoom.us/docs/chat/customizing-messages/markdown/

export let escapeZoomMarkdown = (value: string) =>
  value.replace(/([\\*_~`<])/g, '\\$1').replace(/^(\s*)>/gm, '$1\\>');

// Delimiters are percent-encoded so a URL cannot close the `<...>` token early.
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

export let zoomMarkdownLink = (url: string, label: string | undefined, action: string) => {
  let href = safeUrl(url, action);
  let trimmed = label?.trim();
  if (!trimmed || trimmed === url.trim()) return `<${href}>`;
  return `${escapeZoomMarkdown(trimmed)} <${href}>`;
};

export let zoomMarkdownImage = (url: string, alt: string | null | undefined, action: string) =>
  `<img:${safeUrl(url, action)}${alt?.trim() ? `|${alt.trim().replace(/[|<>]/g, ' ')}` : ''}>`;

export let zoomMonospace = (text: string) =>
  text
    .split('\n')
    .map(line => (line ? `\`${line.replace(/`/g, '\\`')}\`` : ''))
    .join('\n');

let plainText = (node: MarkdownNode): string => {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(plainText).join('');
};

let createZoomRenderer = (action: string) =>
  createMarkdownTextRenderer({
    escape: escapeZoomMarkdown,
    inline: {
      strong: (node, walk) => `**${walk.inline(node.children)}**`,
      emphasis: (node, walk) => `_${walk.inline(node.children)}_`,
      delete: (node, walk) => `~${walk.inline(node.children)}~`,
      inlineCode: node => zoomMonospace(node.value ?? ''),
      link: node => zoomMarkdownLink(node.url ?? '', plainText(node), action),
      image: node => zoomMarkdownImage(node.url ?? '', node.alt, action)
    },
    block: {
      heading: (node, walk) => `**${walk.inline(node.children)}**`,
      blockquote: (node, walk) =>
        walk
          .blocks(node.children)
          .split('\n')
          .map(line => `> ${line}`)
          .join('\n'),
      code: node => zoomMonospace(node.value ?? ''),
      list: (node, walk) => {
        let start = typeof node.start === 'number' ? node.start : 1;
        return (node.children ?? [])
          .map((item, index) => {
            let marker = node.ordered ? `${start + index}.` : '•';
            return `${marker} ${walk.blocks(item.children).replace(/\n/g, '\n   ')}`;
          })
          .join('\n');
      },
      thematicBreak: () => '---',
      table: node => {
        let [headers = [], ...body] = (node.children ?? []).map(row =>
          (row.children ?? []).map(cell => plainText(cell))
        );
        return zoomMonospace(tableToAscii(headers, body));
      }
    }
  });

let renderers = new Map<string, MarkdownTextRenderer>();

/** Zoom chatbot markdown; non-HTTP(S) links and images are rejected for `action`. */
export let markdownToZoomText = (markdown: string, action = 'metorial_chat$message.send') => {
  let renderer = renderers.get(action);
  if (!renderer) {
    renderer = createZoomRenderer(action);
    renderers.set(action, renderer);
  }
  return renderer.render(markdown);
};
