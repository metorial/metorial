import { SlateConfig } from 'slates';
import { z } from './lib/validation';
// Preserve previously stored instance settings without offering a duplicate connection field.
export const config = SlateConfig.create(z.object({}).passthrough());
