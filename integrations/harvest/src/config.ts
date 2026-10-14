import { SlateConfig } from 'slates';
import { z } from 'zod';

// Accept legacy saved account IDs without requesting them during new connection setup.
export let config = SlateConfig.create(z.looseObject({}));
