import { createApiServiceError } from 'slates';
import { z } from 'zod';

const id = z.string().min(1);
const text = z.string().nullish();
const timestamp = z.string().min(1);
const email = z.object({ email: z.string(), type: z.string() });
const phone = z.object({ phone: z.string(), type: z.string() });
const link = z.object({ url: z.string(), type: z.string() });
export const contactSchema = z.object({
  id,
  lead_id: text,
  organization_id: id.optional(),
  name: text,
  title: text,
  display_name: z.string(),
  date_created: timestamp,
  date_updated: timestamp,
  emails: z.array(email).optional(),
  phones: z.array(phone).optional(),
  urls: z.array(link).optional()
});
export const opportunitySchema = z.object({
  id,
  lead_id: id,
  organization_id: id.optional(),
  status_id: id,
  status_label: text,
  status_type: text,
  confidence: z.number(),
  value: z.number().nullish(),
  value_period: z.string(),
  pipeline_id: text,
  note: text,
  date_won: text,
  user_id: id,
  date_created: timestamp,
  date_updated: timestamp
});
export const leadSchema = z.object({
  id,
  organization_id: id.optional(),
  name: text,
  display_name: z.string().optional(),
  status_id: id,
  status_label: text,
  description: text,
  url: text,
  date_created: timestamp,
  date_updated: timestamp,
  contacts: z.array(contactSchema).optional(),
  opportunities: z.array(opportunitySchema).optional(),
  addresses: z
    .array(
      z.object({
        address_1: text,
        address_2: text,
        city: text,
        state: text,
        zipcode: text,
        country: text
      })
    )
    .optional()
});
export const taskSchema = z.object({
  id,
  organization_id: id.optional(),
  lead_id: text,
  contact_id: text,
  text,
  assigned_to: text,
  is_complete: z.boolean(),
  _type: z.string(),
  date: text,
  due_date: text,
  date_created: timestamp,
  date_updated: timestamp
});
export const activitySchema = z.object({
  id,
  organization_id: id.optional(),
  lead_id: text,
  _type: z.string(),
  user_id: text,
  contact_id: text,
  date_created: timestamp,
  date_updated: text,
  activity_at: text,
  subject: text,
  body_text: text,
  note: text
});
export const noteSchema = z.object({
  id,
  lead_id: text,
  organization_id: id.optional(),
  note: z.string(),
  user_id: text,
  contact_id: text,
  date_created: timestamp,
  date_updated: timestamp
});
export const emailSchema = z.object({
  id,
  lead_id: text,
  organization_id: id.optional(),
  status: z.string(),
  contact_id: text,
  subject: text,
  body_html: text,
  body_text: text,
  sender: text,
  thread_id: text,
  date_created: timestamp,
  date_updated: timestamp,
  to: z.array(z.string()),
  cc: z.array(z.string()),
  bcc: z.array(z.string())
});
export const templateSchema = z.object({
  id,
  organization_id: id.optional(),
  name: z.string(),
  subject: text,
  body: text,
  is_archived: z.boolean(),
  date_created: timestamp,
  date_updated: timestamp
});
export const smartViewSchema = z.object({
  id,
  name: z.string(),
  type: z.string(),
  is_shared: z.boolean(),
  user_id: text,
  date_created: timestamp,
  s_query: z.record(z.string(), z.unknown()).nullish(),
  query: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish()
});
export const pipelineSchema = z.object({ id, name: z.string() });
export const leadStatusSchema = z.object({ id, label: z.string(), type: text });
export const opportunityStatusSchema = z.object({
  id,
  label: z.string(),
  type: z.string(),
  pipeline_id: id
});
export const userSchema = z.object({
  id,
  email: z.string(),
  first_name: text,
  last_name: text,
  image: text,
  date_created: text
});
export const meSchema = userSchema.extend({
  email_accounts: z
    .array(
      z.object({
        id,
        organization_id: id,
        user_id: id,
        identities: z.array(z.object({ email: z.string(), name: text }))
      })
    )
    .default([]),
  organizations: z.array(z.object({ id, name: z.string() })),
  memberships: z.array(
    z.object({
      id,
      user_id: id,
      organization_id: id,
      role_id: text,
      permissions_granted: z.array(z.string()).default([])
    })
  )
});
export const pageSchema = <T>(item: z.ZodType<T>) =>
  z.object({
    data: z.array(item),
    has_more: z.boolean(),
    total_results: z.number().int().nonnegative().nullish()
  });
export const searchSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  cursor: z.string().nullable(),
  count: z
    .object({ total: z.number().int().nonnegative(), limited: z.number().int().nonnegative() })
    .optional()
});
export const parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError('Close returned an unexpected response shape.');
  return parsed.data;
};
export type Lead = z.infer<typeof leadSchema> & {
  contacts: Contact[];
  opportunities: Opportunity[];
};
export type Contact = z.infer<typeof contactSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type Task = z.infer<typeof taskSchema>;
export const mapContact = (c: Contact) => ({
  contactId: c.id,
  leadId: c.lead_id ?? undefined,
  name: c.name ?? null,
  title: c.title ?? null,
  emails: c.emails,
  phones: c.phones,
  urls: c.urls,
  dateCreated: c.date_created,
  dateUpdated: c.date_updated
});
export const mapOpportunity = (o: Opportunity) => ({
  opportunityId: o.id,
  leadId: o.lead_id,
  statusId: o.status_id,
  statusLabel: o.status_label ?? undefined,
  statusType: o.status_type ?? undefined,
  confidence: o.confidence,
  value: o.value ?? undefined,
  valuePeriod: o.value_period,
  pipelineId: o.pipeline_id ?? undefined,
  note: o.note ?? undefined,
  dateWon: o.date_won ?? null,
  userId: o.user_id,
  dateCreated: o.date_created,
  dateUpdated: o.date_updated
});
export const mapTask = (t: Task) => ({
  taskId: t.id,
  leadId: t.lead_id ?? undefined,
  contactId: t.contact_id ?? undefined,
  text: t.text ?? undefined,
  assignedTo: t.assigned_to ?? undefined,
  isComplete: t.is_complete,
  dueDate: t.date ?? t.due_date ?? null,
  type: t._type,
  dateCreated: t.date_created,
  dateUpdated: t.date_updated
});
export const mapLead = (l: Lead) => ({
  leadId: l.id,
  name: l.name ?? undefined,
  displayName: l.display_name,
  statusId: l.status_id,
  statusLabel: l.status_label ?? null,
  url: l.url ?? null,
  dateCreated: l.date_created,
  dateUpdated: l.date_updated,
  contacts: l.contacts.map(c => ({
    contactId: c.id,
    name: c.name ?? null,
    title: c.title ?? null,
    emails: c.emails,
    phones: c.phones
  }))
});
