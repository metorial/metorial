import { SlateConfig } from 'slates';
import { z } from 'zod';

// Kept loose so configs stored before the instance URL moved to the auth
// method keep validating; tools read that legacy value only as a fallback.
export let config = SlateConfig.create(z.looseObject({}));
