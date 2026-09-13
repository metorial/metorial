import type {
  CardPart,
  ChartDefinition,
  ChartPart,
  ChatPart,
  DividerPart,
  FieldPart,
  FieldsPart,
  ImagePart,
  LinkPart,
  MarkdownPart,
  SectionPart,
  TableAlign,
  TablePart,
  TextPart,
  TextStyle
} from '../schema/content/part';

export let markdown = (value: string): MarkdownPart => ({
  type: 'markdown',
  markdown: value
});

export let text = (content: string, options: { style?: TextStyle } = {}): TextPart => ({
  type: 'text',
  content,
  style: options.style
});

export let image = (options: { url: string; alt?: string }): ImagePart => ({
  type: 'image',
  url: options.url,
  alt: options.alt
});

export let divider = (): DividerPart => ({ type: 'divider' });

export let link = (options: { url: string; label: string }): LinkPart => ({
  type: 'link',
  url: options.url,
  label: options.label
});

export let field = (options: { label: string; value: string }): FieldPart => ({
  type: 'field',
  label: options.label,
  value: options.value
});

export let fields = (children: FieldPart[]): FieldsPart => ({
  type: 'fields',
  children
});

export let table = (options: {
  headers: string[];
  rows: string[][];
  align?: TableAlign[];
  caption?: string;
  pageSize?: number;
}): TablePart => ({
  type: 'table',
  headers: options.headers,
  rows: options.rows,
  align: options.align,
  caption: options.caption,
  pageSize: options.pageSize
});

export let chart = (options: { title: string; chart: ChartDefinition }): ChartPart => ({
  type: 'chart',
  title: options.title,
  chart: options.chart
});

export let section = (children: ChatPart[]): SectionPart => ({
  type: 'section',
  children
});

export let card = (
  options: { title?: string; subtitle?: string; imageUrl?: string; children?: ChatPart[] } = {}
): CardPart => ({
  type: 'card',
  title: options.title,
  subtitle: options.subtitle,
  imageUrl: options.imageUrl,
  children: options.children ?? []
});
