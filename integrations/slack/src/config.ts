import { SlateConfig } from 'slates';
import { z } from 'zod';

// The Slack Events API is now received through one shared, Metorial-owned webhook registration (see
// triggers/eventsTriggerGroup.ts) rather than a customer-owned Slack app per install, so there is no
// longer a per-instance signing secret to configure here.
export let config = SlateConfig.create(z.object({}));
