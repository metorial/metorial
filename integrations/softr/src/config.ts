import { SlateConfig } from 'slates';
import { z } from './lib/validation';
// Retain genuine saved app settings without duplicating the auth setup property.
export const config = SlateConfig.create(z.object({}).passthrough());
