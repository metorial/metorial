import { config } from 'slates';
import { z } from 'zod';

export let configuration = config(z.object({}));
