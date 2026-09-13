import { z } from 'zod';

export let textStyleSchema = z.enum(['plain', 'bold', 'muted']);
export let tableAlignSchema = z.enum(['left', 'center', 'right']);

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
