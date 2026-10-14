import { z } from 'zod';

export let formFieldSchema = z
  .object({
    id: z.string().optional().describe('Unique field ID within the document'),
    name: z.string().optional().describe('Human-readable field name'),
    fieldType: z
      .string()
      .describe('BoldSign field type, such as Signature, TextBox, or Checkbox'),
    pageNumber: z.number().int().min(1).describe('Page number, starting at 1'),
    bounds: z.object({
      x: z.number().describe('Horizontal field position in pixels'),
      y: z.number().describe('Vertical field position in pixels'),
      width: z.number().positive().describe('Field width in pixels'),
      height: z.number().positive().describe('Field height in pixels')
    }),
    isRequired: z.boolean().optional().describe('Whether the signer must complete this field'),
    value: z.string().optional().describe('Prefilled field value')
  })
  .passthrough();

export type FormField = z.infer<typeof formFieldSchema>;
