import { z } from 'zod';
export const projectIdSchema = z
  .string()
  .optional()
  .describe(
    'Project UID for a Full Access Master V2 API key. Call list_resources with resourceType project to discover it. Omit for a Project key.'
  );
export const resourceTypeSchema = z.enum([
  'image',
  'video',
  'collection',
  'animated_gif',
  'movie',
  'screenshot',
  'template',
  'template_set',
  'video_template',
  'session',
  'diagnosis',
  'joined_pdf',
  'rasterized_pdf',
  'project'
]);
export const listTypeSchema = z.enum([
  'image',
  'video',
  'collection',
  'animated_gif',
  'movie',
  'screenshot',
  'template',
  'template_set',
  'video_template',
  'session',
  'signed_base',
  'project'
]);
