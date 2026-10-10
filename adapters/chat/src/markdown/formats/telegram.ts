import { tableToAscii, toPlainText } from '../fallback';
import { createMarkdownTextRenderer, type MarkdownNode, type MarkdownWalker } from '../walker';

// https://core.telegram.org/bots/api#html-style

export let escapeTelegramHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let escapeAttribute = (value: string) => escapeTelegramHtml(value).replace(/"/g, '&quot;');

/** `label` must already be escaped. */
export let telegramHtmlLink = (url: string, label: string) =>
  `<a href="${escapeAttribute(url)}">${label}</a>`;

let cellText = (node: MarkdownNode) =>
  toPlainText({ type: 'root', children: node.children ?? [] } as any);

let renderList = (node: MarkdownNode, walk: MarkdownWalker, depth: number): string => {
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
      let blocks = (item.children ?? []).map(child => walk.block(child, depth + 1));
      let [first = '', ...rest] = blocks;
      return [`${indent}${marker} ${first}`, ...rest].join('\n');
    })
    .join('\n');
};

let telegram = createMarkdownTextRenderer({
  escape: escapeTelegramHtml,
  inline: {
    strong: (node, walk) => `<b>${walk.inline(node.children)}</b>`,
    emphasis: (node, walk) => `<i>${walk.inline(node.children)}</i>`,
    delete: (node, walk) => `<s>${walk.inline(node.children)}</s>`,
    inlineCode: node => `<code>${escapeTelegramHtml(node.value ?? '')}</code>`,
    link: (node, walk) =>
      telegramHtmlLink(
        node.url ?? '',
        walk.inline(node.children) || escapeTelegramHtml(node.url ?? '')
      ),
    image: node =>
      telegramHtmlLink(node.url ?? '', escapeTelegramHtml(node.alt || node.url || ''))
  },
  block: {
    heading: (node, walk) => `<b>${walk.inline(node.children)}</b>`,
    blockquote: (node, walk) => `<blockquote>${walk.blocks(node.children)}</blockquote>`,
    code: node => {
      let language = node.lang ? ` class="language-${escapeAttribute(node.lang)}"` : '';
      return `<pre><code${language}>${escapeTelegramHtml(node.value ?? '')}</code></pre>`;
    },
    list: renderList,
    thematicBreak: () => '———',
    table: node => {
      let [header, ...rows] = (node.children ?? []).map(row =>
        (row.children ?? []).map(cellText)
      );
      return `<pre>${escapeTelegramHtml(tableToAscii(header ?? [], rows))}</pre>`;
    }
  }
});

/** Telegram Bot API HTML (`parse_mode: HTML`). */
export let markdownToTelegramHtml = (markdown: string) => telegram.render(markdown);
