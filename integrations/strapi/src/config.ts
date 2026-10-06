import { SlateConfig } from 'slates';
import { z } from 'zod';

// Older connections stored the instance here. Preserve those values without asking twice.
export const config = SlateConfig.create(z.object({}).passthrough());
