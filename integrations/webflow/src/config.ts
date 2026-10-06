import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(z.object({}));
