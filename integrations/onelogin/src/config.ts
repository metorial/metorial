import { SlateConfig } from 'slates';
import { z } from 'zod';

// Preserve the configured subdomain of existing unmarked connections; new auth owns its tenant.
export const config = SlateConfig.create(z.object({}).passthrough());
