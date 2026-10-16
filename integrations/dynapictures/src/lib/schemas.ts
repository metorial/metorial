import { z } from 'zod';

export let layerParamsSchema = z.object({
  name: z.string().describe('Name of the template layer to customize'),
  text: z.string().optional().describe('Text content for a text layer'),
  color: z.string().optional().describe('Text or foreground color (hex, rgb, or rgba)'),
  backgroundColor: z.string().optional().describe('Background color (hex, rgb, or rgba)'),
  borderColor: z.string().optional().describe('Border color (hex, rgb, or rgba)'),
  borderWidth: z.string().optional().describe('Border width, e.g. "1px"'),
  borderRadius: z.string().optional().describe('Border radius, e.g. "5px"'),
  imageUrl: z.string().optional().describe('URL of an image to use for an image layer'),
  imagePosition: z
    .string()
    .optional()
    .describe(
      'Image cropping mode: "cro" (crop), "ai_face" (AI face detection), "cov" (cover), or "align" (alignment-based)'
    ),
  imageAlignH: z
    .string()
    .optional()
    .describe('Horizontal alignment: "left", "center", "right", or "full"'),
  imageAlignV: z
    .string()
    .optional()
    .describe('Vertical alignment: "top", "center", "bottom", or "full"'),
  imageEffect: z
    .string()
    .optional()
    .describe(
      'CSS filter value for image effects, e.g. "grayscale(100%)", "blur(5px)", "sepia(100%)"'
    ),
  opacity: z
    .number()
    .optional()
    .describe('Layer opacity from 0.0 (transparent) to 1.0 (opaque)'),
  chartColor: z.string().optional().describe('Chart bar/line color (hex, rgb, or rgba)'),
  chartLabelColor: z.string().optional().describe('Chart label color (hex, rgb, or rgba)'),
  chartDataLabels: z.array(z.string()).optional().describe('Array of chart data labels'),
  chartDataValues: z.array(z.number()).optional().describe('Array of chart data values'),
  prompt: z.string().optional().describe('Prompt for a dynamic AI Image layer'),
  sourceImage: z
    .string()
    .optional()
    .describe('Image URL for a dynamic AI Image layer to edit'),
  referenceImages: z
    .array(
      z.object({
        name: z.string().describe('Reference name used as [name] in the prompt'),
        url: z.string().describe('Publicly reachable reference image URL')
      })
    )
    .optional()
    .describe('Named reference images for a dynamic AI Image layer'),
  value: z.number().optional().describe('Progress value for a gauge or progress bar'),
  maxValue: z.number().optional().describe('Total ticks for a radial tick gauge'),
  activeColor: z.string().optional().describe('Filled tick color for a radial gauge'),
  inactiveColor: z.string().optional().describe('Empty tick color for a radial gauge'),
  circleColor: z.string().optional().describe('Background ring color for a simple gauge'),
  progressColor: z.string().optional().describe('Filled progress arc or bar color'),
  textColor: z.string().optional().describe('Value label color for a simple gauge'),
  remainingColor: z.string().optional().describe('Remaining track color for a progress bar'),
  label: z.string().optional().describe('Custom progress bar label'),
  labelAlign: z
    .string()
    .optional()
    .describe('Progress bar label alignment: left, center, or right')
});

export let generatedPageSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string(),
    thumbnailUrl: z.string(),
    retinaThumbnailUrl: z.string().optional(),
    metadata: z.string().optional(),
    width: z.number(),
    height: z.number(),
    pageIndex: z.number().optional()
  })
  .passthrough();
