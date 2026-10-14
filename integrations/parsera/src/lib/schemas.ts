import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let attributeSchema = z.object({
  name: z.string().describe('Name of the data field to extract'),
  description: z
    .string()
    .describe('Natural-language description of what this field should contain'),
  type: z
    .enum(['string', 'integer', 'number', 'bool', 'list', 'any'])
    .optional()
    .describe('Expected output type for this field')
});

export let cookieSchema = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().optional().describe('Cookie path')
});

export type Attribute = z.infer<typeof attributeSchema>;
export type Cookie = z.infer<typeof cookieSchema>;

export let validateExtraction = (input: { prompt?: string; attributes?: Attribute[] }) => {
  if (!input.prompt?.trim() && !input.attributes?.length) {
    throw createApiServiceError(
      'Provide a non-empty prompt or at least one attribute describing the data to extract.'
    );
  }
  if (
    input.attributes?.some(
      attribute => !attribute.name.trim() || !attribute.description.trim()
    )
  ) {
    throw createApiServiceError(
      'Each extraction attribute must have a non-empty name and description.'
    );
  }
};
