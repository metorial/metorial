import { tableToAscii } from '../fallback';
import { createMarkdownTextRenderer, type MarkdownNode, type MarkdownWalker } from '../walker';

// https://developers.google.com/workspace/chat/format-messages

export let googleChatCodeBlock = (value: string) =>
  `\`\`\`\n${value.replace(/\n$/, '')}\n\`\`\``;

export let googleChatLink = (url: string, label?: string) => {
  let text = label?.trim();
  if (!text || text === url) return url;
  return `<${url}|${text.replace(/[|>]/g, ' ')}>`;
};

let renderList = (node: MarkdownNode, walk: MarkdownWalker, depth: number): string =>
  (node.children ?? [])
    .map((item, index) => {
      let indent = '    '.repeat(depth);
      let marker = node.ordered ? `${(node.start ?? 1) + index}.` : '*';
      let lines: string[] = [];
      for (let child of item.children ?? []) {
        if (child.type === 'list') lines.push(walk.block(child, depth + 1));
        else if (lines.length === 0)
          lines.push(`${indent}${marker} ${walk.block(child, depth)}`);
        else lines.push(`${indent}    ${walk.block(child, depth)}`);
      }
      return lines.length ? lines.join('\n') : `${indent}${marker}`;
    })
    .join('\n');

let googleChat = createMarkdownTextRenderer({
  inline: {
    strong: (node, walk) => `*${walk.inline(node.children)}*`,
    emphasis: (node, walk) => `_${walk.inline(node.children)}_`,
    delete: (node, walk) => `~${walk.inline(node.children)}~`,
    inlineCode: node => `\`${node.value ?? ''}\``,
    link: (node, walk) => googleChatLink(node.url ?? '', walk.inline(node.children)),
    image: node => googleChatLink(node.url ?? '', node.alt ?? undefined)
  },
  block: {
    root: (node, walk, depth) =>
      (node.children ?? []).map(child => walk.block(child, depth)).join('\n\n'),
    heading: (node, walk) => `*${walk.inline(node.children)}*`,
    code: node => googleChatCodeBlock(node.value ?? ''),
    blockquote: (node, walk, depth) =>
      (node.children ?? [])
        .map(child => walk.block(child, depth))
        .join('\n')
        .split('\n')
        .map(line => `>${line}`)
        .join('\n'),
    list: renderList,
    thematicBreak: () => '---',
    table: (node, walk) => {
      let [headers = [], ...rows] = (node.children ?? []).map(row =>
        (row.children ?? []).map(cell => walk.inline(cell.children))
      );
      return googleChatCodeBlock(tableToAscii(headers, rows));
    }
  }
});

export let markdownToGoogleChatText = (markdown: string) => googleChat.render(markdown).trim();
