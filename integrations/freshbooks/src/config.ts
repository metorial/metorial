import { SlateConfig } from 'slates';
import { z } from 'zod';

// Existing stored account/business values remain readable for compatibility.
export const config = SlateConfig.create(z.object({}).passthrough());
