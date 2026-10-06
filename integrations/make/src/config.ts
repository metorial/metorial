import { SlateConfig } from 'slates';
import { z } from './lib/schemas';

export const config = SlateConfig.create(z.object({}).passthrough());
