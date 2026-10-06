import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain saved legacy spaceId at runtime without requiring opaque setup identifiers.
export const config = SlateConfig.create(z.object({}).passthrough());
