import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create().output(z.object({})).addNone();
