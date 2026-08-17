import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

export type StringifyMarkdownOptions = {
  bullet?: '*' | '-' | '+';
  emphasis?: '*' | '_';
};

export let stringifyMarkdown = (ast: Root, options?: StringifyMarkdownOptions): string => {
  return unified().use(remarkStringify, options).use(remarkGfm).stringify(ast);
};
