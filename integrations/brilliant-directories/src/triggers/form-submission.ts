import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmission = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description: `Triggered when a form is submitted on the Brilliant Directories website. Covers member signups (free and paid), reviews, lead submissions, contact forms, newsletter signups/unsubscribes, member imports, and post creation/updates.`,
  instructions: [
    'Configure the webhook URL in the Brilliant Directories Admin Dashboard under Developer Hub >> Webhooks.',
    'Select the appropriate form event(s) to send data to the webhook endpoint.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The type of form event (e.g., "member_review_submitted", "lead_submitted", "free_member_signup").'
        ),
      eventId: z.string().describe('Unique identifier for this event.'),
      submittedData: z
        .record(z.string(), z.any())
        .describe('The data submitted with the form.')
    })
  )
  .output(
    z.object({
      formType: z.string().describe('The type of form that was submitted.'),
      submittedData: z
        .record(z.string(), z.any())
        .describe('The full data payload from the form submission.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;
      try {
        body = (await ctx.request.json()) as Record<string, any>;
      } catch {
        try {
          let text = await ctx.request.text();
          let params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        } catch {
          body = {};
        }
      }

      let eventType = body.event_type || body.form_type || body.webhook_event || 'unknown';
      let eventId =
        body.id ||
        body.user_id ||
        body.lead_id ||
        body.review_id ||
        body.post_id ||
        body.group_id ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            submittedData: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        member_review_submitted: 'review.submitted',
        contact_us_form_submitted: 'contact.submitted',
        newsletter_signup: 'newsletter.signup',
        newsletter_unsubscribe: 'newsletter.unsubscribe',
        lead_submitted: 'lead.submitted',
        paid_member_signup_onsite: 'member.paid_signup_onsite',
        paid_member_signup_offsite: 'member.paid_signup_offsite',
        free_member_signup: 'member.free_signup',
        member_import_admin_update: 'member.import_or_admin_update',
        post_standard: 'post.standard',
        post_photo_album: 'post.photo_album'
      };

      let normalizedType = eventTypeMap[ctx.input.eventType] || `form.${ctx.input.eventType}`;

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          formType: ctx.input.eventType,
          submittedData: ctx.input.submittedData
        }
      };
    }
  })
  .build();
