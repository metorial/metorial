import { SlateConfig } from 'slates';
import { z } from 'zod';

// Passthrough preserves already-stored accountId without requiring it on new connections.
export const config = SlateConfig.create(z.object({}).passthrough());
