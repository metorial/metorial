import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve historical stored origins without declaring a second connection setting.
export let config = SlateConfig.create(z.object({}).passthrough());
