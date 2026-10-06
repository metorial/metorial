import { z } from 'zod';
export const userSchema = z.object({
  id: z.string().min(1),
  fullName: z.string(),
  email: z.string()
});
export const groupSchema = z.object({ id: z.string().min(1), name: z.string() });
const entitySchema = z.object({
  id: z.string().min(1),
  entityType: z.string(),
  fullName: z.string()
});
const fieldValues = z.record(z.string(), z.unknown());
const nullableText = z
  .union([z.string(), z.number()])
  .nullable()
  .transform(value => (value === null ? null : String(value)));
const contactFields = {
  id: z.string().min(1),
  description: z.string(),
  createdAt: z.string().nullable(),
  groups: z.array(groupSchema),
  addresses: z.array(z.string()),
  emails: z.array(z.string()),
  phones: z.array(z.string()),
  urls: z.array(z.string()),
  customFieldValues: fieldValues
};
export const personSchema = z.object({
  ...contactFields,
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  birthday: z.string().nullable(),
  jobTitle: z.string(),
  companies: z.array(groupSchema)
});
export const companySchema = z.object({
  ...contactFields,
  name: z.string(),
  fundingRaised: nullableText,
  lastFundingDate: z.string().nullable(),
  industry: z.string().nullable(),
  foundationYear: nullableText,
  employeeRange: z.string().nullable()
});
export const dealSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  companies: z.array(groupSchema),
  people: z.array(z.object({ id: z.string().min(1), fullName: z.string() })),
  createdAt: z.string(),
  customFieldValues: fieldValues
});
export const customFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  options: z.array(z.object({ label: z.string(), color: z.string() })).optional(),
  config: z
    .object({ format: z.string().optional(), currency: z.string().optional() })
    .optional()
});
export const noteSchema = z.object({
  id: z.string().min(1),
  entity: entitySchema,
  content: z.string(),
  visibility: z.string(),
  author: z.object({ fullName: z.string(), email: z.string() }),
  createdAt: z.string(),
  parentNote: z.object({ id: z.string().min(1) }).nullish()
});
export const reminderSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  entity: entitySchema,
  recurrenceRule: z.string(),
  visibility: z.string(),
  assignedUsers: z.array(userSchema),
  nextTriggerTime: z.string().nullable(),
  lastTriggerTime: z.string().nullable(),
  createdAt: z.string().nullable()
});
export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().nullable(),
  entity: entitySchema,
  dueAt: z.string(),
  dueTime: z.string().nullable(),
  completedAt: z.string().nullable(),
  recurrenceFrequency: z.string().nullable(),
  isPublic: z.boolean(),
  assignedUsers: z.array(userSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});
export const filterSchema = z
  .record(z.string(), z.record(z.string(), z.unknown()))
  .optional()
  .describe(
    'Documented filters keyed by field then operator, for example {"fullName":{"eq":"Example"}}. Use null with empty/not_empty; reference filters accept {"id":"..."} or {"email":"..."}. Preserve filters when using nextCursor.'
  );
export const combinatorSchema = z
  .enum(['and', 'or'])
  .optional()
  .describe('Combine filter conditions with and (default) or or.');
