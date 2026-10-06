import { SlateConfig } from 'slates';
import { z } from 'zod';
// The region belongs to authentication. Old stored serverUrl values are ignored;
// all legacy tool handlers already read the saved auth serverUrl.
export const config = SlateConfig.create(z.object({}));
