import { z } from 'zod';
export const id = z.number().int().positive().safe();
const text = z.string().nullish(),
  count = z.number().nonnegative().safe().nullish(),
  flag = z.boolean().nullish();
const relation = z.object({ id }).nullish(),
  fields = z.record(z.string(), z.unknown()).nullish(),
  tags = z.array(z.string()).nullish();
export const userSchema = z.object({
  id,
  guid: text,
  name: text,
  email: text,
  first_name: text,
  last_name: text,
  active: flag,
  role: text
});
export const personSchema = z.object({
  id,
  first_name: text,
  last_name: text,
  display_name: text,
  email_address: text,
  secondary_email_address: text,
  phone: text,
  mobile_phone: text,
  title: text,
  city: text,
  state: text,
  country: text,
  linkedin_url: text,
  job_seniority: text,
  do_not_contact: flag,
  account: relation,
  owner: relation,
  custom_fields: fields,
  tags,
  created_at: text,
  updated_at: text
});
export const accountSchema = z.object({
  id,
  name: text,
  domain: text,
  website: text,
  description: text,
  phone: text,
  linkedin_url: text,
  twitter_handle: text,
  street: text,
  city: text,
  state: text,
  postal_code: text,
  country: text,
  industry: text,
  company_type: text,
  size: text,
  founded: text,
  revenue_range: text,
  do_not_contact: flag,
  owner: relation,
  custom_fields: fields,
  tags,
  crm_id: text,
  created_at: text,
  updated_at: text
});
export const cadenceSchema = z.object({
  id,
  name: text,
  cadence_state: text,
  current_state: text,
  team_cadence: flag,
  shared: flag,
  draft: flag,
  cadence_framework_id: id.nullish(),
  owner: relation,
  created_at: text,
  updated_at: text,
  counts: z.object({ cadence_people: count, people_acted_on_count: count }).nullish(),
  tags
});
export const membershipSchema = z.object({
  id,
  person: z.object({ id }),
  cadence: z.object({ id }),
  user: relation,
  currently_on_cadence: z.boolean(),
  current_state: text,
  created_at: text,
  updated_at: text
});
export const noteSchema = z.object({
  id,
  content: text,
  associated_type: text,
  associated_with: relation,
  user: relation,
  call: relation,
  created_at: text,
  updated_at: text
});
export const emailSchema = z.object({
  id,
  subject: text,
  status: text,
  bounced: flag,
  counts: z.object({ clicks: count, views: count, replies: count }).nullish(),
  sent_at: text,
  created_at: text,
  updated_at: text,
  recipient: relation,
  user: relation,
  cadence: relation,
  step: relation
});
export const callSchema = z.object({
  id,
  to: text,
  duration: count,
  sentiment: text,
  disposition: text,
  status: text,
  note: relation,
  created_at: text,
  updated_at: text,
  called_person: relation,
  user: relation,
  cadence: relation
});
export const templateSchema = z.object({
  id,
  title: text,
  subject: text,
  body: text,
  counts: z
    .object({
      views: count,
      clicks: count,
      replies: count,
      sent_emails: count,
      bounces: count
    })
    .nullish(),
  shared: flag,
  team_template: z.object({ id: z.string() }).nullish(),
  template_owner: relation,
  created_at: text,
  updated_at: text
});
export const taskSchema = z.object({
  id,
  subject: text,
  task_type: text,
  current_state: text,
  due_date: text,
  description: text,
  completed_at: text,
  person: relation,
  user: relation,
  created_at: text,
  updated_at: text
});
export const pagingSchema = z.object({
  per_page: z.number().int().positive().safe(),
  current_page: z.number().int().positive().safe(),
  next_page: id.nullable(),
  prev_page: id.nullable()
});
