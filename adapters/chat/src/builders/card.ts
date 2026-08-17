import type {
  ActionChild,
  ActionsPart,
  ButtonPart,
  ButtonStyle,
  CardPart,
  ChartDefinition,
  ChartPart,
  ChatPart,
  DividerPart,
  ExternalSelectPart,
  FieldPart,
  FieldsPart,
  ImagePart,
  LinkButtonPart,
  LinkPart,
  MarkdownPart,
  RadioSelectPart,
  SectionPart,
  SelectOption,
  SelectPart,
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

export let button = (options: {
  id: string;
  label: string;
  style?: ButtonStyle;
  value?: string;
  actionType?: 'action' | 'modal';
  callbackUrl?: string;
  disabled?: boolean;
}): ButtonPart => ({
  type: 'button',
  id: options.id,
  label: options.label,
  style: options.style,
  value: options.value,
  actionType: options.actionType,
  callbackUrl: options.callbackUrl,
  disabled: options.disabled
});

export let linkButton = (options: {
  url: string;
  label: string;
  id?: string;
  style?: ButtonStyle;
}): LinkButtonPart => ({
  type: 'link-button',
  url: options.url,
  label: options.label,
  id: options.id,
  style: options.style
});

export let select = (options: {
  id: string;
  label: string;
  options: SelectOption[];
  initialOption?: string;
  placeholder?: string;
  optional?: boolean;
}): SelectPart => ({
  type: 'select',
  id: options.id,
  label: options.label,
  options: options.options,
  initialOption: options.initialOption,
  placeholder: options.placeholder,
  optional: options.optional
});

export let radioSelect = (options: {
  id: string;
  label: string;
  options: SelectOption[];
  initialOption?: string;
  optional?: boolean;
}): RadioSelectPart => ({
  type: 'radio-select',
  id: options.id,
  label: options.label,
  options: options.options,
  initialOption: options.initialOption,
  optional: options.optional
});

export let externalSelect = (options: {
  id: string;
  label: string;
  minQueryLength?: number;
  initialOption?: SelectOption;
  placeholder?: string;
  optional?: boolean;
}): ExternalSelectPart => ({
  type: 'external-select',
  id: options.id,
  label: options.label,
  minQueryLength: options.minQueryLength,
  initialOption: options.initialOption,
  placeholder: options.placeholder,
  optional: options.optional
});

export let actions = (children: ActionChild[]): ActionsPart => ({
  type: 'actions',
  children
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
