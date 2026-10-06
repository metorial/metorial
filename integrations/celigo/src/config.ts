import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain the region on existing configurations; new connections select their auth region.
export const config = SlateConfig.create(z.object({}).passthrough());
