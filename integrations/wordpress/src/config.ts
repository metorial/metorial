import { SlateConfig } from 'slates';
import { z } from 'zod';

// The connected site comes from the auth method: the blog authorized on the
// WordPress.com consent screen, or the site URL entered with an application password.
export let config = SlateConfig.create(z.object({}));
