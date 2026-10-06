import { z } from 'zod';

const string = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const dateFields = { created_at: string, updated_at: string };
const id = z.string().min(1);
export const pageSchema = z.object({
  id,
  name: string,
  page_description: string,
  subdomain: string,
  domain: string,
  url: string,
  time_zone: string,
  allow_email_subscribers: z.boolean().optional(),
  allow_sms_subscribers: z.boolean().optional(),
  allow_webhook_subscribers: z.boolean().optional(),
  allow_rss_atom_feeds: z.boolean().optional(),
  viewers_must_be_team_members: z.boolean().optional(),
  ...dateFields
});
export const componentSchema = z.object({
  id,
  name: z.string(),
  status: z.string(),
  description: string,
  position: z.number().optional(),
  showcase: z.boolean().optional(),
  group_id: string,
  only_show_if_degraded: z.boolean().optional(),
  automation_email: string,
  ...dateFields
});
export const groupSchema = z.object({
  id,
  name: z.string(),
  description: string,
  components: z.array(z.union([z.string(), z.object({ id })])),
  position: z
    .union([
      z.number(),
      z
        .string()
        .regex(/^-?\d+$/)
        .transform(Number)
    ])
    .optional(),
  ...dateFields
});
const updateSchema = z.object({ id, status: z.string(), body: string, ...dateFields });
export const incidentSchema = z.object({
  id,
  name: z.string(),
  status: z.string(),
  impact: string,
  shortlink: string,
  scheduled_for: string,
  scheduled_until: string,
  resolved_at: string,
  incident_updates: z.array(updateSchema).optional(),
  components: z.array(componentSchema).optional(),
  ...dateFields
});
export const templateSchema = z.object({
  id,
  name: string,
  title: string,
  body: string,
  group_id: string,
  update_status: string,
  should_tweet: z.boolean().optional(),
  should_send_notifications: z.boolean().optional(),
  components: z.array(componentSchema).optional()
});
export const subscriberSchema = z.object({
  id,
  type: string,
  mode: z.string(),
  email: string,
  phone_number: string,
  endpoint: string,
  state: string,
  quarantined_at: string,
  ...dateFields
});
export const metricSchema = z.object({
  id,
  name: z.string(),
  metrics_provider_id: string,
  metric_identifier: string,
  display: z.boolean().optional(),
  suffix: string,
  tooltip_description: string,
  decimal_places: z.number().optional(),
  most_recent_data_at: string,
  ...dateFields
});
export const metricsProviderSchema = z.object({
  id,
  type: z.string(),
  disabled: z.boolean().optional()
});
export const postmortemSchema = z.object({
  body: string,
  body_draft: string,
  published_at: string
});
export type Group = z.output<typeof groupSchema>;
export const groupComponentIds = (group: Group) =>
  group.components.map(component =>
    typeof component === 'string' ? component : component.id
  );
