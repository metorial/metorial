import {
  createMarkdownTextRenderer,
  type MarkdownNode,
  type MarkdownWalker,
  prefixLines
} from '../walker';

let renderList = (node: MarkdownNode, walk: MarkdownWalker) => {
  let start = node.start ?? 1;
  return (node.children ?? [])
    .map((item, index) => {
      let marker = node.ordered ? `${start + index}.` : '-';
      return prefixLines(walk.blocks(item.children), `${marker} `, '  ');
    })
    .join('\n');
};

let messenger = createMarkdownTextRenderer({
  inline: {
    inlineCode: node => node.value ?? '',
    html: node => node.value ?? '',
    link: (node, walk) => {
      let label = walk.inline(node.children);
      let url = node.url ?? '';
      return !label || label === url ? url : `${label} (${url})`;
    },
    image: node => (node.alt ? `${node.alt} (${node.url ?? ''})` : (node.url ?? ''))
  },
  inlineFallback: (node, walk) => walk.inline(node.children),
  block: {
    heading: (node, walk) => walk.inline(node.children),
    code: node => node.value ?? '',
    thematicBreak: () => '---',
    blockquote: (node, walk) => prefixLines(walk.blocks(node.children), '> '),
    list: renderList,
    table: (node, walk) =>
      (node.children ?? [])
        .map(row => (row.children ?? []).map(cell => walk.inline(cell.children)).join(' | '))
        .join('\n'),
    html: node => node.value ?? ''
  },
  blockFallback: (node, walk) =>
    node.children ? walk.blocks(node.children) : walk.inlineNode(node)
});

/** Plain text: Messenger renders no markup. */
export let markdownToMessengerText = (markdown: string) => messenger.render(markdown).trim();
