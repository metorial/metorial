import { z } from 'zod';

export let positiveIntegerSchema = z
  .number()
  .refine(value => Number.isSafeInteger(value) && value > 0, 'Use a positive whole number.');
