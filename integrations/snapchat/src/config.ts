import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(z.object({}));
