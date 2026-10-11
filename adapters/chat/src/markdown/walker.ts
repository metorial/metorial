import { parseMarkdown } from './parse';

/** The mdast fields text renderers read, loosely typed so one walker covers every node. */
export interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string | null;
  lang?: string | null;
  identifier?: string;
  depth?: number;
  ordered?: boolean | null;
  start?: number | null;
  checked?: boolean | null;
  children?: MarkdownNode[];
}

export interface MarkdownWalker {
  inline: (nodes: MarkdownNode[] | undefined) => string;
  inlineNode: (node: MarkdownNode) => string;
  block: (node: MarkdownNode, depth?: number) => string;
  /** Renders blocks at `depth` and joins the non-empty ones with a blank line. */
  blocks: (nodes: MarkdownNode[] | undefined, depth?: number) => string;
}

export type MarkdownNodeRenderer = (
  node: MarkdownNode,
  walk: MarkdownWalker,
  depth: number
) => string;

export interface MarkdownTextFormat {
  /** Applied to text values by the default renderers. */
  escape?: (value: string) => string;
  inline?: Record<string, MarkdownNodeRenderer>;
  block?: Record<string, MarkdownNodeRenderer>;
  /** Unlisted inline nodes; defaults to their children, else their escaped value. */
  inlineFallback?: MarkdownNodeRenderer;
  /** Unlisted block nodes; defaults to rendering them as inline nodes. */
  blockFallback?: MarkdownNodeRenderer;
}

export interface MarkdownTextRenderer extends MarkdownWalker {
  render: (markdown: string) => string;
}

let pick = (table: Record<string, MarkdownNodeRenderer> | undefined, type: string) =>
  table && Object.hasOwn(table, type) ? table[type] : undefined;

export let createMarkdownTextRenderer = (format: MarkdownTextFormat): MarkdownTextRenderer => {
  let escapeText = format.escape ?? ((value: string) => value);

  let defaultInline: Record<string, MarkdownNodeRenderer> = {
    text: node => escapeText(node.value ?? ''),
    break: () => '\n'
  };
  let defaultBlock: Record<string, MarkdownNodeRenderer> = {
    root: (node, walk, depth) => walk.blocks(node.children, depth),
    paragraph: (node, walk) => walk.inline(node.children)
  };
  let inlineFallback: MarkdownNodeRenderer =
    format.inlineFallback ??
    ((node, walk) =>
      node.children ? walk.inline(node.children) : escapeText(node.value ?? ''));
  let blockFallback: MarkdownNodeRenderer =
    format.blockFallback ?? ((node, walk) => walk.inlineNode(node));

  let walker: MarkdownWalker = {
    inline: nodes => (nodes ?? []).map(node => walker.inlineNode(node)).join(''),
    inlineNode: node => {
      let render =
        pick(format.inline, node.type) ?? pick(defaultInline, node.type) ?? inlineFallback;
      return render(node, walker, 0);
    },
    block: (node, depth = 0) => {
      let render =
        pick(format.block, node.type) ?? pick(defaultBlock, node.type) ?? blockFallback;
      return render(node, walker, depth);
    },
    blocks: (nodes, depth = 0) =>
      (nodes ?? [])
        .map(node => walker.block(node, depth))
        .filter(text => text.length > 0)
        .join('\n\n')
  };

  return {
    ...walker,
    render: markdown => walker.block(parseMarkdown(markdown) as unknown as MarkdownNode)
  };
};

/** Prefixes the first line with `first` and every later line with `rest`. */
export let prefixLines = (text: string, first: string, rest = first) =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? first : rest) + line)
    .join('\n');
