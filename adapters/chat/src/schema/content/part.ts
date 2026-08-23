import { z } from 'zod';

export let buttonStyleSchema = z.enum(['primary', 'danger', 'default']);
export let textStyleSchema = z.enum(['plain', 'bold', 'muted']);
export let tableAlignSchema = z.enum(['left', 'center', 'right']);

export type ButtonStyle = z.infer<typeof buttonStyleSchema>;
export type TextStyle = z.infer<typeof textStyleSchema>;
export type TableAlign = z.infer<typeof tableAlignSchema>;

export let markdownPartSchema = z.object({
  type: z.literal('markdown'),
  markdown: z.string()
});

export let textPartSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  style: textStyleSchema.optional()
});

export let imagePartSchema = z.object({
  type: z.literal('image'),
  url: z.string(),
  alt: z.string().optional()
});

export let dividerPartSchema = z.object({
  type: z.literal('divider')
});

export let linkPartSchema = z.object({
  type: z.literal('link'),
  url: z.string(),
  label: z.string()
});

export let fieldPartSchema = z.object({
  type: z.literal('field'),
  label: z.string(),
  value: z.string()
});

export let fieldsPartSchema = z.object({
  type: z.literal('fields'),
  children: z.array(fieldPartSchema)
});

export let tablePartSchema = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  align: z.array(tableAlignSchema).optional(),
  caption: z.string().optional(),
  pageSize: z.number().int().positive().optional()
});

export let pieChartSchema = z.object({
  type: z.literal('pie'),
  segments: z.array(z.object({ label: z.string(), value: z.number() }))
});

export let seriesChartSchema = z.object({
  type: z.enum(['bar', 'area', 'line']),
  categories: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.object({ label: z.string(), value: z.number() }))
    })
  ),
  xLabel: z.string().optional(),
  yLabel: z.string().optional()
});

export let chartDefinitionSchema = z.union([pieChartSchema, seriesChartSchema]);

export let chartPartSchema = z.object({
  type: z.literal('chart'),
  title: z.string(),
  chart: chartDefinitionSchema
});

export let buttonPartSchema = z.object({
  type: z.literal('button'),
  id: z.string(),
  label: z.string(),
  style: buttonStyleSchema.optional(),
  value: z.string().optional(),
  actionType: z.enum(['action', 'modal']).optional(),
  callbackUrl: z.string().optional(),
  disabled: z.boolean().optional()
});

export let linkButtonPartSchema = z.object({
  type: z.literal('link-button'),
  id: z.string().optional(),
  label: z.string(),
  url: z.string(),
  style: buttonStyleSchema.optional()
});

export let selectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional()
});

export let selectPartSchema = z.object({
  type: z.literal('select'),
  id: z.string(),
  label: z.string(),
  options: z.array(selectOptionSchema),
  initialOption: z.string().optional(),
  placeholder: z.string().optional(),
  optional: z.boolean().optional()
});

export let radioSelectPartSchema = z.object({
  type: z.literal('radio-select'),
  id: z.string(),
  label: z.string(),
  options: z.array(selectOptionSchema),
  initialOption: z.string().optional(),
  optional: z.boolean().optional()
});

export let externalSelectPartSchema = z.object({
  type: z.literal('external-select'),
  id: z.string(),
  label: z.string(),
  minQueryLength: z.number().int().optional(),
  initialOption: selectOptionSchema.optional(),
  placeholder: z.string().optional(),
  optional: z.boolean().optional()
});

export let actionChildSchema = z.discriminatedUnion('type', [
  buttonPartSchema,
  linkButtonPartSchema,
  selectPartSchema,
  radioSelectPartSchema,
  externalSelectPartSchema
]);

export let actionsPartSchema = z.object({
  type: z.literal('actions'),
  children: z.array(actionChildSchema)
});

export type MarkdownPart = z.infer<typeof markdownPartSchema>;
export type TextPart = z.infer<typeof textPartSchema>;
export type ImagePart = z.infer<typeof imagePartSchema>;
export type DividerPart = z.infer<typeof dividerPartSchema>;
export type LinkPart = z.infer<typeof linkPartSchema>;
export type FieldPart = z.infer<typeof fieldPartSchema>;
export type FieldsPart = z.infer<typeof fieldsPartSchema>;
export type TablePart = z.infer<typeof tablePartSchema>;
export type PieChart = z.infer<typeof pieChartSchema>;
export type SeriesChart = z.infer<typeof seriesChartSchema>;
export type ChartDefinition = z.infer<typeof chartDefinitionSchema>;
export type ChartPart = z.infer<typeof chartPartSchema>;
export type ButtonPart = z.infer<typeof buttonPartSchema>;
export type LinkButtonPart = z.infer<typeof linkButtonPartSchema>;
export type SelectOption = z.infer<typeof selectOptionSchema>;
export type SelectPart = z.infer<typeof selectPartSchema>;
export type RadioSelectPart = z.infer<typeof radioSelectPartSchema>;
export type ExternalSelectPart = z.infer<typeof externalSelectPartSchema>;
export type ActionChild = z.infer<typeof actionChildSchema>;
export type ActionsPart = z.infer<typeof actionsPartSchema>;

export type SectionPart = {
  type: 'section';
  children: ChatPart[];
};

export type CardPart = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: ChatPart[];
};

export type ChatPart =
  | MarkdownPart
  | TextPart
  | ImagePart
  | DividerPart
  | LinkPart
  | FieldsPart
  | TablePart
  | ChartPart
  | ActionsPart
  | SectionPart
  | CardPart;

export let chatPartSchema: z.ZodType<ChatPart> = z.lazy(() =>
  z.union([
    markdownPartSchema,
    textPartSchema,
    imagePartSchema,
    dividerPartSchema,
    linkPartSchema,
    fieldsPartSchema,
    tablePartSchema,
    chartPartSchema,
    actionsPartSchema,
    sectionPartSchema,
    cardPartSchema
  ])
);

export let sectionPartSchema: z.ZodType<SectionPart> = z.lazy(() =>
  z.object({
    type: z.literal('section'),
    children: z.array(chatPartSchema)
  })
);

export let cardPartSchema: z.ZodType<CardPart> = z.lazy(() =>
  z.object({
    type: z.literal('card'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    imageUrl: z.string().optional(),
    children: z.array(chatPartSchema)
  })
);
