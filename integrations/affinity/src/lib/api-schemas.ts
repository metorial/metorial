import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const identifier = z.number().int().positive().safe();
const nullableText = z.string().nullish();
const ids = z.array(identifier).optional();
export const entrySchema = z.object({
  id: identifier,
  list_id: identifier,
  entity_id: identifier.optional(),
  entity_type: z.number().optional(),
  entity: z.object({ type: z.number().optional() }).optional(),
  creator_id: identifier.nullish(),
  created_at: nullableText
});
const interactionDates = z.record(z.string(), nullableText).nullish();
export const personSchema = z.object({
  id: identifier,
  type: z.number().optional(),
  first_name: nullableText,
  last_name: nullableText,
  primary_email: nullableText,
  emails: z.array(z.string()).optional(),
  organization_ids: ids,
  list_entries: z.array(entrySchema).optional(),
  interaction_dates: interactionDates
});
export const organizationSchema = z.object({
  id: identifier,
  name: nullableText,
  domain: nullableText,
  domains: z.array(z.string()).optional(),
  global: z.boolean(),
  person_ids: ids,
  list_entries: z.array(entrySchema).optional(),
  interaction_dates: interactionDates
});
export const opportunitySchema = z.object({
  id: identifier,
  name: nullableText,
  list_id: identifier.optional(),
  person_ids: ids,
  organization_ids: ids,
  list_entries: z.array(entrySchema).optional()
});
export const listSchema = z.object({
  id: identifier,
  name: z.string(),
  type: z.number(),
  public: z.boolean(),
  owner_id: identifier.nullish(),
  creator_id: identifier.nullish(),
  list_size: z.number().nullish()
});
export const fieldSchema = z.object({
  id: identifier,
  name: z.string(),
  list_id: identifier.nullish(),
  enrichment_source: nullableText,
  value_type: z.number(),
  allows_multiple: z.boolean(),
  track_changes: z.boolean().optional(),
  dropdown_options: z
    .array(
      z.object({
        id: identifier,
        text: z.string(),
        rank: z.number().nullish(),
        color: z.number().nullish()
      })
    )
    .optional()
});
export const fieldValueSchema = z.object({
  id: identifier,
  field_id: identifier,
  entity_id: identifier,
  list_entry_id: identifier.nullish(),
  value: z.unknown(),
  created_at: nullableText,
  updated_at: nullableText
});
export const changeSchema = z.object({
  id: identifier,
  field_id: identifier,
  entity_id: identifier,
  list_entry_id: identifier.nullish(),
  action_type: z.number(),
  changed_at: nullableText,
  changer: z
    .object({ id: identifier.nullish(), type: z.union([z.number(), z.string()]).nullish() })
    .nullish(),
  value: z.unknown().optional(),
  value_before: z.unknown().optional(),
  value_after: z.unknown().optional()
});
export const noteSchema = z.object({
  id: identifier,
  creator_id: identifier.nullish(),
  person_ids: ids,
  organization_ids: ids,
  opportunity_ids: ids,
  content: nullableText,
  created_at: nullableText,
  updated_at: nullableText
});
const associatedEntity = z.object({ id: identifier }).nullish();
export const reminderSchema = z.object({
  id: identifier,
  owner: z.object({ id: identifier }),
  person: associatedEntity,
  organization: associatedEntity,
  opportunity: associatedEntity,
  content: nullableText,
  due_date: nullableText,
  status: z.number().nullish(),
  type: z.number().nullish(),
  reset_type: z.number().nullish(),
  reminder_days: z.number().nullish(),
  created_at: nullableText
});
export const fileSchema = z.object({
  id: identifier,
  name: nullableText,
  size: z
    .union([
      z.number().nonnegative().safe(),
      z.string().regex(/^\d+$/).transform(Number).pipe(z.number().nonnegative().safe())
    ])
    .nullish(),
  person_id: identifier.nullish(),
  organization_id: identifier.nullish(),
  opportunity_id: identifier.nullish(),
  uploader_id: identifier.nullish(),
  created_at: nullableText
});
export const interactionSchema = z.object({
  id: identifier,
  type: z.number(),
  subject: nullableText,
  title: nullableText,
  body: nullableText,
  date: nullableText,
  start_time: nullableText,
  created_at: nullableText,
  persons: z.array(z.object({ id: identifier })).optional(),
  from: associatedEntity,
  to: z.array(z.object({ id: identifier })).optional(),
  cc: z.array(z.object({ id: identifier })).optional(),
  person_ids: ids
});
export const whoamiSchema = z.object({
  tenant: z.object({ id: identifier, name: z.string(), subdomain: z.string() }),
  user: z.object({
    id: identifier,
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  }),
  grant: z.object({
    type: z.string(),
    scope: z.string().optional(),
    createdAt: z.string().optional()
  })
});
export const deletedSchema = z.object({ success: z.literal(true) });
export const pagination = <S extends z.ZodType>(schema: S, key: string) =>
  z.union([z.array(schema), z.record(z.string(), z.unknown())]).transform(value => {
    const parsed = z.array(schema).safeParse(Array.isArray(value) ? value : value[key]);
    const token = Array.isArray(value) ? undefined : value.next_page_token;
    if (!parsed.success || (token != null && typeof token !== 'string'))
      throw createApiServiceError('Affinity returned an invalid collection response.');
    return { items: parsed.data, next_page_token: typeof token === 'string' ? token : null };
  });
