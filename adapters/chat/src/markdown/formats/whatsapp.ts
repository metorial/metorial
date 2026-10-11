import { tableToAscii, toPlainText } from '../fallback';
import {
  createMarkdownTextRenderer,
  type MarkdownNode,
  type MarkdownWalker,
  prefixLines
} from '../walker';

// Formatting: https://whatsapp.com/faq/en/general/26000002

/** Wraps content in a marker, keeping edge whitespace outside since WhatsApp ignores markers next to spaces. */
export let wrapWhatsAppMarker = (marker: string, content: string) => {
  let match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
  let [, leading = '', inner = '', trailing = ''] = match ?? [];
  if (!inner) return content;
  return `${leading}${marker}${inner}${marker}${trailing}`;
};

let renderList = (node: MarkdownNode, walk: MarkdownWalker): string => {
  let start = typeof node.start === 'number' ? node.start : 1;
  return (node.children ?? [])
    .map((item, index) => {
      let marker = node.ordered ? `${start + index}. ` : '- ';
      let task = item.checked === true ? '[x] ' : item.checked === false ? '[ ] ' : '';
      let content = (item.children ?? [])
        .map(child => walk.block(child))
        .filter(Boolean)
        .join('\n');
      return prefixLines(`${task}${content}`, marker, ' '.repeat(marker.length));
    })
    .join('\n');
};

let whatsapp = createMarkdownTextRenderer({
  inline: {
    strong: (node, walk) => wrapWhatsAppMarker('*', walk.inline(node.children)),
    emphasis: (node, walk) => wrapWhatsAppMarker('_', walk.inline(node.children)),
    delete: (node, walk) => wrapWhatsAppMarker('~', walk.inline(node.children)),
    inlineCode: node => (node.value ? `\`${node.value}\`` : ''),
    link: (node, walk) => {
      let label = walk.inline(node.children).trim();
      let url = node.url ?? '';
      if (!label || label === url) return url;
      return `${label} (${url})`;
    },
    image: node => {
      let url = node.url ?? '';
      return node.alt ? `${node.alt} (${url})` : url;
    },
    imageReference: node => node.alt ?? '',
    footnoteReference: node => `[${node.identifier ?? ''}]`
  },
  block: {
    heading: (node, walk) => wrapWhatsAppMarker('*', walk.inline(node.children)),
    blockquote: (node, walk) => prefixLines(walk.blocks(node.children), '> '),
    list: renderList,
    code: node => `\`\`\`\n${node.value ?? ''}\n\`\`\``,
    thematicBreak: () => '———',
    table: (node, walk) => {
      let rows = (node.children ?? []).map(row =>
        (row.children ?? []).map(cell => toPlainText(walk.inline(cell.children)))
      );
      let [headers = [], ...body] = rows;
      return `\`\`\`\n${tableToAscii(headers, body)}\n\`\`\``;
    },
    definition: () => '',
    footnoteDefinition: (node, walk) =>
      `[${node.identifier ?? ''}] ${walk.blocks(node.children)}`
  },
  blockFallback: (node, walk) =>
    node.children ? walk.blocks(node.children) : (node.value ?? '')
});

export let markdownToWhatsAppText = (markdown: string) => whatsapp.render(markdown).trim();
