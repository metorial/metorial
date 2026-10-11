import { SlateConfig } from 'slates';
import { z } from 'zod';

// Tenant selection belongs to the auth methods (OAuth tenant or the bot connection's
// tenant ID); nothing here is tool-scoped.
export let config = SlateConfig.create(z.object({}));
