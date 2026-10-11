import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type DripRecord } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

const broadcastShape = z.object({
  broadcastId: z.string(),
  name: z.string().optional(),
  status: z
    .string()
    .optional()
    .describe('draft, scheduled, sending, sent, canceled or deleted.'),
  subject: z.string().optional(),
  preheader: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().optional(),
  postalAddress: z.string().optional(),
  sendAt: z.string().optional().describe('Scheduled send time, when scheduled or sent.'),
  localizeSendingTime: z.boolean().optional(),
  audienceSummary: z
    .string()
    .optional()
    .describe('Plain-English description of who the campaign goes to.'),
  previewUrl: z.string().optional().describe('Public preview link for the email content.'),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  createdAt: z.string().optional()
});

const mapBroadcast = (b: DripRecord) => ({
  broadcastId: b.id,
  name: b.name,
  status: b.status,
  subject: b.subject,
  preheader: b.preheader,
  fromName: b.from_name,
  fromEmail: b.from_email,
  postalAddress: b.postal_address,
  sendAt: b.send_at,
  localizeSendingTime: b.localize_sending_time,
  audienceSummary:
    typeof b.derived?.audience === 'string' ? (b.derived.audience as string) : undefined,
  previewUrl: b.preview_url,
  htmlBody: b.html_body,
  textBody: b.text_body,
  createdAt: b.created_at
});

const fail = (message: string) => {
  throw createApiServiceError(message, { reason: 'invalid_input' });
};

export const manageBroadcast = SlateTool.create(spec, {
  name: 'Manage Broadcast',
  key: 'manage_broadcast',
  description:
    'Create, read, edit, target, test, schedule, unschedule or delete a single-email campaign (broadcast). New broadcasts start as drafts; only drafts can be edited, targeted or scheduled. Use list_broadcasts to discover IDs and list_segments to find audience segments.',
  instructions: [
    'HTML content must include an unsubscribe tag ({{ unsubscribe_url }} or {{ unsubscribe_link }}) and a postal address tag ({{ postal_address }}, {{ inline_postal_address }} or {{ html_postal_address }}).',
    'Without a target audience a scheduled broadcast goes to everyone eligible. Use set_audience before schedule to narrow it.',
    'schedule sends real email to the audience. Confirm the content and audience with the user first; use send_test to preview.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      action: z
        .enum([
          'get',
          'create',
          'update',
          'delete',
          'send_test',
          'get_audience',
          'set_audience',
          'schedule',
          'unschedule'
        ])
        .describe(
          'Operation. Every action except create needs broadcastId. delete is a soft delete; a broadcast that is currently sending cannot be deleted.'
        ),
      broadcastId: z.string().optional().describe('Broadcast ID from list_broadcasts.'),
      name: z
        .string()
        .optional()
        .describe('Private broadcast name (max 255 characters). Required for create.'),
      subject: z
        .string()
        .optional()
        .describe('Email subject line; supports Liquid. Required for create.'),
      htmlContent: z
        .string()
        .optional()
        .describe(
          'Full HTML document for the email body; supports Liquid. Required for create. Must include unsubscribe and postal address tags.'
        ),
      textContent: z
        .string()
        .optional()
        .describe('Plain-text version. Generated from the HTML when omitted on create.'),
      preheader: z
        .string()
        .optional()
        .describe('Preview text shown before the email is opened (create/update).'),
      postalAddress: z
        .string()
        .optional()
        .describe('Mailing address for CAN-SPAM compliance (create/update).'),
      testRecipients: z
        .array(z.string())
        .optional()
        .describe(
          'send_test: 1 to 5 addresses on a verified sending domain or belonging to active account members.'
        ),
      previewAs: z
        .string()
        .optional()
        .describe('send_test: email of an existing subscriber used to personalize Liquid.'),
      audienceSegmentIds: z
        .array(z.string())
        .optional()
        .describe(
          'set_audience: include people in ANY of these segment IDs (from list_segments).'
        ),
      excludeSegmentIds: z
        .array(z.string())
        .optional()
        .describe('set_audience: exclude people in any of these segment IDs.'),
      audienceEveryone: z
        .boolean()
        .optional()
        .describe(
          'set_audience: true to target everyone eligible (clears segment targeting); do not combine with segment IDs. schedule: required as confirmation when the broadcast targets everyone eligible.'
        ),
      confirmReplaceAudience: z
        .boolean()
        .optional()
        .describe(
          'set_audience: must be true when the broadcast already has a non-default audience; the old audience cannot be recovered.'
        ),
      sendAt: z
        .string()
        .optional()
        .describe(
          'schedule: ISO-8601 send time at least 5 minutes away (14 hours 5 minutes when localized). Use this or sendImmediately.'
        ),
      localizeSendingTime: z
        .boolean()
        .optional()
        .describe(
          "schedule: required with sendAt. false sends at that instant; true sends at that time of day in each person's time zone."
        ),
      sendImmediately: z
        .boolean()
        .optional()
        .describe('schedule: true to send now instead of at sendAt.'),
      autoResend: z
        .boolean()
        .optional()
        .describe('schedule: resend to people who did not open the first email.'),
      resendSubject: z.string().optional().describe('schedule: subject for the resend.'),
      resendDelayDays: z
        .number()
        .int()
        .optional()
        .describe(
          'schedule: whole days (at least 1) before the resend. Required with autoResend.'
        )
    })
  )
  .output(
    z.object({
      broadcast: broadcastShape.optional().describe('The broadcast after the operation.'),
      audience: z
        .object({
          segmentFilter: z
            .array(z.array(z.record(z.string(), z.any())))
            .optional()
            .describe(
              'Audience filter: OR of AND-sets of segment conditions. [[]] means everyone.'
            ),
          summary: z.string().optional(),
          message: z.string().optional(),
          unsupportedTypes: z.array(z.string()).optional()
        })
        .optional()
        .describe('get_audience result.'),
      testSent: z.boolean().optional().describe('send_test: Drip accepted the test send.')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const client = new Client({
      token: ctx.auth.token,
      accountId: input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    const content = () => {
      if (input.htmlContent === undefined && input.textContent === undefined) return undefined;
      const value: DripRecord = {};
      if (input.htmlContent !== undefined)
        value.html = { type: 'document', value: input.htmlContent };
      if (input.textContent !== undefined)
        value.text = { type: 'document', value: input.textContent };
      return value;
    };
    const fields = () => {
      const value: DripRecord = {};
      if (input.name !== undefined) value.name = input.name;
      if (input.subject !== undefined) value.subject = input.subject;
      if (input.preheader !== undefined) value.preheader = input.preheader;
      if (input.postalAddress !== undefined) value.postal_address = input.postalAddress;
      const body = content();
      if (body) value.content = body;
      return value;
    };
    const done = (result: DripRecord, message: string) => ({
      output: { broadcast: mapBroadcast(result.broadcasts[0]) },
      message
    });

    if (input.action === 'create') {
      if (!input.name || !input.subject || !input.htmlContent)
        fail('name, subject and htmlContent are required to create a broadcast.');
      const result = await client.createBroadcast(fields());
      return done(result, `Created draft broadcast **${result.broadcasts[0].id}**.`);
    }

    const broadcastId = input.broadcastId;
    if (!broadcastId) return fail(`broadcastId is required for ${input.action}.`);

    if (input.action === 'get') {
      const result = await client.fetchBroadcast(broadcastId);
      return done(
        result,
        `Fetched broadcast **${result.broadcasts[0].name ?? broadcastId}**.`
      );
    }

    if (input.action === 'update') {
      const body = fields();
      if (!Object.keys(body).length)
        fail(
          'Provide at least one of name, subject, htmlContent, textContent, preheader or postalAddress.'
        );
      const result = await client.updateBroadcast(broadcastId, body);
      return done(result, 'Updated the draft broadcast.');
    }

    if (input.action === 'delete') {
      const result = await client.deleteBroadcast(broadcastId);
      return done(result, 'Deleted the broadcast; it now has the deleted status.');
    }

    if (input.action === 'send_test') {
      const recipients = input.testRecipients ?? [];
      if (recipients.length < 1 || recipients.length > 5)
        fail('send_test needs 1 to 5 testRecipients.');
      const body: DripRecord = { to_emails: recipients };
      if (input.previewAs) body.preview_as = input.previewAs;
      await client.sendBroadcastTest(broadcastId, body);
      return {
        output: { testSent: true },
        message: `Drip accepted the test send to ${recipients.length} recipient(s).`
      };
    }

    if (input.action === 'get_audience') {
      const result = await client.fetchBroadcastAudience(broadcastId);
      const audience = result.audience;
      return {
        output: {
          audience: {
            segmentFilter: Array.isArray(audience.filter) ? audience.filter : undefined,
            summary: typeof audience.summary === 'string' ? audience.summary : undefined,
            message: typeof audience.message === 'string' ? audience.message : undefined,
            unsupportedTypes: Array.isArray(audience.unsupported_types)
              ? audience.unsupported_types.filter((t: unknown) => typeof t === 'string')
              : undefined
          }
        },
        message: 'Fetched the broadcast audience.'
      };
    }

    if (input.action === 'set_audience') {
      const include = input.audienceSegmentIds ?? [];
      const exclude = (input.excludeSegmentIds ?? []).map(id => ({
        type: 'segments',
        properties: { operator: 'not_in', segment_id: id }
      }));
      if (input.audienceEveryone && (include.length || exclude.length))
        fail('Use audienceEveryone alone, or provide segment IDs instead.');
      if (!input.audienceEveryone && !include.length && !exclude.length)
        fail('Provide audienceSegmentIds, excludeSegmentIds, or audienceEveryone: true.');
      for (const id of [...include, ...(input.excludeSegmentIds ?? [])])
        if (!id.trim()) fail('Segment IDs must be nonempty.');
      const filter = input.audienceEveryone
        ? [[]]
        : include.length
          ? include.map(id => [
              { type: 'segments', properties: { operator: 'in', segment_id: id } },
              ...exclude
            ])
          : [exclude];
      const body: DripRecord = { filter };
      if (input.confirmReplaceAudience) body.confirm = true;
      const result = await client.setBroadcastAudience(broadcastId, body);
      return done(result, 'Updated the broadcast audience.');
    }

    if (input.action === 'schedule') {
      if (Boolean(input.sendAt) === Boolean(input.sendImmediately))
        fail('Provide exactly one of sendAt or sendImmediately: true.');
      if (input.sendAt && input.localizeSendingTime === undefined)
        fail('localizeSendingTime is required with sendAt.');
      if (input.sendImmediately && input.localizeSendingTime !== undefined)
        fail('Do not combine sendImmediately with localizeSendingTime.');
      if (input.sendAt && !Number.isFinite(Date.parse(input.sendAt)))
        fail('sendAt must be an ISO-8601 timestamp.');
      if (
        input.autoResend &&
        (input.resendDelayDays === undefined || input.resendDelayDays < 1)
      )
        fail('resendDelayDays (at least 1) is required when autoResend is true.');
      // A new draft targets everyone eligible, and Drip does not check the audience when
      // scheduling, so sending to the whole list needs explicit confirmation.
      const { audience } = await client.fetchBroadcastAudience(broadcastId);
      const groups = Array.isArray(audience.filter) ? audience.filter : [];
      const targetsEveryone = groups.every(
        (group: unknown) => !Array.isArray(group) || group.length === 0
      );
      if (targetsEveryone && input.audienceEveryone !== true)
        fail(
          'This broadcast targets everyone eligible. Call set_audience to target segments, or pass audienceEveryone: true to confirm sending to the whole list.'
        );
      const body: DripRecord = {};
      if (input.sendAt) {
        body.send_at = input.sendAt;
        body.localize_sending_time = input.localizeSendingTime;
      } else body.send_immediately = true;
      if (input.autoResend !== undefined) body.auto_resend = input.autoResend;
      if (input.resendSubject !== undefined) body.resend_subject = input.resendSubject;
      if (input.resendDelayDays !== undefined) body.resend_delay = input.resendDelayDays;
      const result = await client.scheduleBroadcast(broadcastId, body);
      return done(
        result,
        input.sendImmediately
          ? 'Drip accepted the broadcast for immediate sending.'
          : `Scheduled the broadcast for ${result.broadcasts[0].send_at ?? input.sendAt}.`
      );
    }

    const result = await client.unscheduleBroadcast(broadcastId);
    return done(result, 'Returned the broadcast to draft; it will not send.');
  })
  .build();
