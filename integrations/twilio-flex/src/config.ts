import { SlateConfig } from 'slates';
import { z } from 'zod';
// Connection credentials own the account. Existing stored fields remain readable.
export let config = SlateConfig.create(z.object({}).passthrough());
