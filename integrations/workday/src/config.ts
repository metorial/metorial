import { SlateConfig } from 'slates';
import { z } from 'zod';
// Preserve historical connection bindings until auth refresh persists them.
export const config = SlateConfig.create(z.object({}).passthrough());
