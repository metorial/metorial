import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export let parseMarkdown = (markdown: string): Root => {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
};
