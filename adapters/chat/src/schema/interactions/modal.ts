import { z } from 'zod';
import {
  externalSelectPartSchema,
  fieldsPartSchema,
  radioSelectPartSchema,
  selectPartSchema,
  textPartSchema
} from '../content/part';

export let textInputPartSchema = z.object({
  type: z.literal('text_input'),
  id: z.string(),
  label: z.string(),
  initialValue: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  multiline: z.boolean().optional(),
  optional: z.boolean().optional(),
  placeholder: z.string().optional()
});

export let dateInputPartSchema = z.object({
  type: z.literal('date_input'),
  id: z.string(),
  label: z.string(),
  initialValue: z.string().optional().describe('YYYY-MM-DD'),
  optional: z.boolean().optional(),
  placeholder: z.string().optional()
});

export let numberInputPartSchema = z.object({
  type: z.literal('number_input'),
  id: z.string(),
  label: z.string(),
  decimal: z.boolean().optional(),
  initialValue: z.number().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  optional: z.boolean().optional(),
  placeholder: z.string().optional()
});

export let modalChildSchema = z.union([
  textInputPartSchema,
  dateInputPartSchema,
  numberInputPartSchema,
  selectPartSchema,
  externalSelectPartSchema,
  radioSelectPartSchema,
  textPartSchema,
  fieldsPartSchema
]);

export let modalSchema = z.object({
  type: z.literal('modal'),
  title: z.string(),
  callbackId: z.string(),
  callbackUrl: z.string().optional(),
  submitLabel: z.string().optional(),
  closeLabel: z.string().optional(),
  notifyOnClose: z.boolean().optional(),
  privateMetadata: z.string().optional(),
  children: z.array(modalChildSchema)
});

export type TextInputPart = z.infer<typeof textInputPartSchema>;
export type DateInputPart = z.infer<typeof dateInputPartSchema>;
export type NumberInputPart = z.infer<typeof numberInputPartSchema>;
export type ModalChild = z.infer<typeof modalChildSchema>;
export type Modal = z.infer<typeof modalSchema>;
