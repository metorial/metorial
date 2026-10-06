import { SlateConfig } from 'slates';
import { z } from 'zod';

// Historical stored environment values remain readable; new connections select it during authentication.
export const config = SlateConfig.create(z.looseObject({}));
