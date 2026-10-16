import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let rawSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Original provider object, including null values and fields outside the normalized projection'
  );
export let paginationSchema = z.object({
  limit: z.number(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable()
});

export let listOutputSchema = z.object({
  listId: z.string().describe('Unique identifier of the list'),
  name: z.string().describe('Name of the list'),
  state: z.string().describe('Current state of the list'),
  remarks: z.string().describe('Notes or remarks on the list'),
  subscribeNotificationEmail: z.string().describe('Email notified on new subscriptions'),
  unsubscribeNotificationEmail: z.string().describe('Email notified on unsubscriptions'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp'),
  members: z
    .object({
      active: z.number().describe('Number of active subscribers'),
      unsubscribed: z.number().describe('Number of unsubscribed members'),
      cleaned: z.number().describe('Number of cleaned (bounced) members')
    })
    .describe('Subscriber count breakdown'),
  raw: rawSchema
});

export let memberOutputSchema = z.object({
  memberId: z.string().describe('Unique identifier of the subscriber'),
  listId: z.string().describe('ID of the list the subscriber belongs to'),
  email: z.string().describe('Email address of the subscriber'),
  state: z.string().describe('Status: active, unsubscribed, unconfirmed, or cleaned'),
  signupDate: z.string().describe('Date the subscriber was added'),
  modified: z.string().describe('Last modified timestamp'),
  ip: z.string().describe('IP address at signup'),
  sourceUrl: z.string().describe('URL where the subscriber signed up'),
  customFields: z
    .record(z.string(), z.string())
    .describe(
      'String-valued custom fields. All original field values are available in customFieldValues and raw.'
    ),
  customFieldValues: rawSchema.describe(
    'All original custom field values, including numbers and arrays'
  ),
  raw: rawSchema
});

export let fieldOutputSchema = z.object({
  fieldId: z.string().describe('Unique identifier of the field'),
  listId: z.string().describe('ID of the list the field belongs to'),
  name: z.string().describe('Display name of the field'),
  tag: z.string().describe('Template tag used to reference this field in campaign content'),
  datatype: z
    .string()
    .describe('Data type: text, numeric, date, select_single, or select_multiple'),
  datatypeDisplay: z
    .string()
    .optional()
    .describe('Display type for select fields: select or radio'),
  defaultvalue: z.string().describe('Default value for the field'),
  required: z.boolean().describe('Whether the field is required'),
  inForm: z.boolean().describe('Whether the field is shown in subscription forms'),
  inList: z.boolean().describe('Whether the field is shown in list overviews'),
  options: z
    .record(z.string(), z.string())
    .optional()
    .describe('Select option labels keyed by provider option ID, when available'),
  state: z.string().describe('Current state of the field'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  customName: z.string().optional().describe('Key to use in subscriber customFields'),
  raw: rawSchema
});

export let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Unique identifier of the segment'),
  listId: z.string().describe('ID of the list the segment belongs to'),
  name: z.string().describe('Name of the segment'),
  definition: z
    .string()
    .describe('Laposta segment expression based on custom field conditions'),
  state: z.string().optional().describe('Current state of the segment'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp'),
  raw: rawSchema
});

export let campaignOutputSchema = z.object({
  campaignId: z.string().describe('Unique identifier of the campaign'),
  name: z.string().describe('Internal name of the campaign'),
  subject: z.string().describe('Email subject line'),
  state: z.string().optional().describe('Current state of the campaign'),
  type: z.string().describe('Campaign type (e.g. regular)'),
  fromName: z.string().describe('Sender display name'),
  fromEmail: z.string().describe('Sender email address'),
  replyTo: z.string().describe('Reply-to email address'),
  listIds: z.array(z.string()).describe('Target mailing list IDs'),
  googleAnalytics: z.string().describe('Google Analytics tracking status'),
  mtrack: z.string().optional().describe('Mtrack tracking status'),
  deliveryRequested: z.string().nullable().describe('Scheduled delivery date/time'),
  deliveryStarted: z.string().nullable().describe('Actual delivery start time'),
  deliveryEnded: z.string().nullable().describe('Delivery completion time'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp'),
  previewText: z.string().optional(),
  listSegments: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe('Target list IDs and their selected segment IDs'),
  raw: rawSchema
});

export let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Unique identifier of the webhook'),
  listId: z.string().describe('ID of the list the webhook is bound to'),
  event: z.string().describe('Event type: subscribed, modified, or deactivated'),
  url: z.string().describe('Target URL for webhook delivery'),
  blocked: z.boolean().describe('Whether the webhook is currently blocked'),
  secret: z.string().describe('Secret used for HMAC-SHA256 signature verification'),
  state: z.string().describe('Current state of the webhook'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp'),
  raw: rawSchema
});

export let reportOutputSchema = z.object({
  campaignId: z.string().describe('Campaign this report belongs to'),
  sent: z.number().describe('Total emails sent'),
  accepted: z.number().describe('Emails accepted by mail servers'),
  cleaned: z.number().describe('Addresses cleaned (removed)'),
  complained: z.number().describe('Spam complaints'),
  hardbounced: z.number().describe('Hard bounces'),
  softbounced: z.number().optional().describe('Soft bounces'),
  unsubscribed: z.number().describe('Unsubscribes from the campaign'),
  openedUnique: z.number().describe('Unique opens'),
  clickedUnique: z.number().describe('Unique clicks'),
  webversionUnique: z.number().describe('Unique web version views'),
  acceptedRatio: z.number().describe('Acceptance ratio (0-1)'),
  openedRatio: z.number().describe('Open ratio (0-1)'),
  clickedRatio: z.number().describe('Click ratio (0-1)'),
  raw: rawSchema
});

export let memberReadOutputSchema = memberOutputSchema.extend({
  modified: memberOutputSchema.shape.modified.optional()
});
export let segmentReadOutputSchema = segmentOutputSchema.extend({
  modified: segmentOutputSchema.shape.modified.optional()
});
export let segmentDeleteOutputSchema = segmentOutputSchema.extend({
  state: z.string(),
  modified: segmentOutputSchema.shape.modified.optional()
});
export let campaignCreateOutputSchema = campaignOutputSchema.extend({
  modified: campaignOutputSchema.shape.modified.optional()
});
export let campaignDeleteOutputSchema = campaignOutputSchema.extend({ state: z.string() });
export let webhookNullableModifiedOutputSchema = webhookOutputSchema.extend({
  modified: webhookOutputSchema.shape.modified.optional()
});
export let contentOutputSchema = z.object({
  campaignId: z.string(),
  html: z.string(),
  plaintext: z.string(),
  importUrl: z.string(),
  raw: rawSchema
});

let checked = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let result = schema.safeParse(value);
  if (!result.success)
    throw createApiServiceError(
      `Laposta returned an invalid response: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}.`
    );
  return result.data;
};

let optional = (value: unknown) => (value === null ? undefined : value);
let record = (value: unknown): Record<string, unknown> => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('Laposta returned an invalid object.');
  return value;
};

export let mapList = (input: unknown) => {
  let r = record(input);
  return checked(listOutputSchema, {
    listId: r.list_id,
    name: r.name,
    state: r.state,
    remarks: r.remarks,
    subscribeNotificationEmail: r.subscribe_notification_email,
    unsubscribeNotificationEmail: r.unsubscribe_notification_email,
    created: r.created,
    modified: r.modified,
    members: r.members,
    raw: r
  });
};

export let mapMember = <T>(input: unknown, schema: z.ZodType<T>) => {
  let r = record(input);
  let fields = record(r.custom_fields);
  return checked(schema, {
    memberId: r.member_id,
    listId: r.list_id,
    email: r.email,
    state: r.state,
    signupDate: r.signup_date,
    modified: optional(r.modified),
    ip: r.ip,
    sourceUrl: r.source_url,
    customFields: Object.fromEntries(
      Object.entries(fields).filter(([, value]) => typeof value === 'string')
    ),
    customFieldValues: fields,
    raw: r
  });
};

export let mapField = (input: unknown) => {
  let r = record(input);
  let options: Record<string, string> | undefined;
  if (r.options !== undefined)
    checked(z.union([z.array(z.string()), z.record(z.string(), z.string())]), r.options);
  if (r.options_full !== undefined) {
    let parsed = checked(
      z.array(z.object({ id: z.union([z.string(), z.number()]), value: z.string() })),
      r.options_full
    );
    options = Object.fromEntries(parsed.map(option => [String(option.id), option.value]));
  } else if (isApiErrorRecord(r.options)) {
    options = checked(z.record(z.string(), z.string()), r.options);
  }
  return checked(fieldOutputSchema, {
    fieldId: r.field_id,
    listId: r.list_id,
    name: r.name,
    tag: r.tag,
    customName: r.custom_name,
    datatype: r.datatype,
    datatypeDisplay: optional(r.datatype_display),
    defaultvalue: r.defaultvalue,
    required: r.required,
    inForm: r.in_form,
    inList: r.in_list,
    options,
    state: r.state,
    created: r.created,
    modified: optional(r.modified),
    raw: r
  });
};

export let mapSegment = <T>(input: unknown, schema: z.ZodType<T>) => {
  let r = record(input);
  return checked(schema, {
    segmentId: r.segment_id,
    listId: r.list_id,
    name: r.name,
    definition: r.definition,
    state: r.state,
    created: r.created,
    modified: optional(r.modified),
    raw: r
  });
};

export let mapCampaign = <T>(input: unknown, schema: z.ZodType<T>) => {
  let r = record(input);
  let from = record(r.from);
  let stats = record(r.stats);
  let targets = Array.isArray(r.list_ids)
    ? undefined
    : checked(z.record(z.string(), z.array(z.string())), r.list_ids);
  return checked(schema, {
    campaignId: r.campaign_id,
    name: r.name,
    subject: r.subject,
    state: r.state,
    type: r.type,
    fromName: from.name,
    fromEmail: from.email,
    replyTo: r.reply_to,
    listIds: targets ? Object.keys(targets) : r.list_ids,
    listSegments: targets,
    googleAnalytics: stats.ga,
    mtrack: stats.mtrack,
    deliveryRequested: r.delivery_requested,
    deliveryStarted: r.delivery_started,
    deliveryEnded: r.delivery_ended,
    created: r.created,
    modified: optional(r.modified),
    previewText: r.previewtext,
    raw: r
  });
};

export let mapWebhook = <T>(input: unknown, schema: z.ZodType<T>) => {
  let r = record(input);
  return checked(schema, {
    webhookId: r.webhook_id,
    listId: r.list_id,
    event: r.event,
    url: r.url,
    blocked: r.blocked,
    secret: r.secret,
    state: r.state,
    created: r.created,
    modified: optional(r.modified),
    raw: r
  });
};

export let mapReport = (input: unknown) => {
  let r = record(input);
  return checked(reportOutputSchema, {
    campaignId: r.campaign_id,
    sent: r.sent,
    accepted: r.accepted,
    cleaned: r.cleaned,
    complained: r.complained,
    hardbounced: r.hardbounced,
    softbounced: r.softbounced,
    unsubscribed: r.unsubscribed,
    openedUnique: r.opened_unique,
    clickedUnique: r.clicked_unique,
    webversionUnique: r.webversion_unique,
    acceptedRatio: r.accepted_ratio,
    openedRatio: r.opened_ratio,
    clickedRatio: r.clicked_ratio,
    raw: r
  });
};

export let mapContent = (input: unknown) => {
  let r = record(input);
  return checked(contentOutputSchema, {
    campaignId: r.campaign_id,
    html: r.html,
    plaintext: r.plaintext,
    importUrl: r.import_url,
    raw: r
  });
};
