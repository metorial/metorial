import { SlateConfig } from 'slates';
import { z } from 'zod';

// The instance URL is authentication-scoped because login and profile calls
// need it. Keep it out of integration config so connections have one owner.
export let config = SlateConfig.create(z.object({}));
