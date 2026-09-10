import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain legacy regional configuration without exposing a second site setting.
export let config = SlateConfig.create(z.object({}).passthrough());
