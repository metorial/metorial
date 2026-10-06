import { SlateConfig } from 'slates';
import { z } from 'zod';

// Retain stored legacy instance configuration without advertising a duplicate setting.
export const config = SlateConfig.create(z.looseObject({}));
