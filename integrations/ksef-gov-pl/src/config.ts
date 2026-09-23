import { SlateConfig } from 'slates';
import { z } from 'zod';

export const config = SlateConfig.create(z.object({}));
