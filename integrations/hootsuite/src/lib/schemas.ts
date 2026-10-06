import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let organizationId = z
  .string()
  .describe('Organization ID. Call get_user_info to discover authorized organizations.');

export let identifier = (value: string, label = 'ID') => {
  if (
    !value.trim() ||
    [...value].some(character => {
      let code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    throw createApiServiceError(`Provide a nonempty ${label} without control characters.`);
  }
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError(`Provide a valid Unicode ${label}.`);
  }
};

let id = z
  .union([z.string(), z.number().int().safe()])
  .transform(String)
  .refine(value => value.trim().length > 0 && value !== 'undefined' && value !== 'null');
let text = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
let optionalId = id.nullish().transform(value => value ?? undefined);

export let memberSchema = z.object({
  id,
  fullName: text,
  email: text,
  language: text,
  timezone: text,
  companyName: text,
  bio: text
});
export let organizationSchema = z.object({ id, name: text });
export let teamSchema = z.object({ id, name: text, organizationId: optionalId });
export let socialProfileSchema = z.object({
  id,
  type: text,
  socialNetworkId: optionalId,
  socialNetworkUsername: text,
  avatarUrl: text,
  ownerId: optionalId,
  owner: z.union([z.string(), z.object({ id })]).nullish(),
  isReauthRequired: z.union([z.number(), z.boolean()]).nullish()
});
export let messageSchema = z.object({
  id,
  state: z.string().min(1),
  text,
  socialProfile: z.object({ id }).nullish(),
  scheduledSendTime: text,
  postUrl: text,
  postId: optionalId,
  sequenceNumber: z
    .number()
    .nullish()
    .transform(value => value ?? undefined),
  tags: z
    .array(z.string())
    .nullish()
    .transform(value => value ?? undefined),
  createdByMember: z.object({ id }).nullish()
});
export let permissionSchema = z.object({
  permissions: z.array(z.string()).optional(),
  permissionPreset: text
});
export let uploadSchema = z.object({
  id,
  uploadUrl: z.string(),
  uploadUrlDurationSeconds: z.number().int().positive()
});
export let mediaSchema = z.object({
  id,
  state: z.string().min(1),
  downloadUrl: text,
  downloadUrlDurationSeconds: z
    .number()
    .int()
    .positive()
    .nullish()
    .transform(value => value ?? undefined),
  mimeType: text,
  thumbnailUrl: text
});

export let validateData = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError(
      `Hootsuite returned an incomplete or invalid ${operation} response. Inspect the resource before retrying a write.`,
      { reason: 'invalid_provider_response' }
    );
  }
  return result.data;
};

export let validateUtc = (value: string, label: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    throw createApiServiceError(`${label} must be a valid UTC ISO-8601 date ending in Z.`);
  }
  return Date.parse(value);
};

export let trustedMediaUrl = (value: string, kind: 'upload' | 'download') => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError(
      'Hootsuite returned an invalid media destination. Request media details again.'
    );
  }
  let hosts =
    kind === 'upload'
      ? ['hootsuite-video.s3.amazonaws.com', 'hootsuite-video.s3.us-east-1.amazonaws.com']
      : [
          'hootsuiteapis.s3-us-east-1.amazonaws.com',
          'hootsuiteapis.s3.us-east-1.amazonaws.com'
        ];
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !hosts.includes(url.hostname) ||
    (kind === 'upload' ? !url.pathname.startsWith('/production/') : url.pathname === '/')
  ) {
    throw createApiServiceError(
      'Hootsuite returned an unexpected media destination. Do not transfer the file; request media details again.'
    );
  }
  return url.toString();
};

export type Member = z.infer<typeof memberSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Team = z.infer<typeof teamSchema>;
export type SocialProfile = z.infer<typeof socialProfileSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Media = z.infer<typeof mediaSchema>;
