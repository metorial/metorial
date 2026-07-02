import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().describe('Email address'),
  status: z.string().optional().describe('Verification status')
});

let phoneSchema = z.object({
  number: z.string().describe('Phone number'),
  region: z.string().optional().describe('ISO region code')
});

let contactResultSchema = z.object({
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  domain: z.string().optional(),
  mostProbableEmail: z.string().optional(),
  mostProbableEmailStatus: z.string().optional(),
  mostProbablePhone: z.string().optional(),
  emails: z.array(emailSchema).optional(),
  phones: z.array(phoneSchema).optional(),
  custom: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom tracking fields from the original request'),
  linkedinUrl: z.string().optional(),
  headline: z.string().optional(),
  currentTitle: z.string().optional(),
  currentCompany: z.string().optional()
});

export let enrichmentCompleted = SlateTrigger.create(spec, {
  name: 'Enrichment Completed',
  key: 'enrichment_completed',
  description:
    'Triggers when a contact enrichment or reverse email lookup batch completes, is canceled, or runs out of credits. Fires once per batch with all results. You can also receive per-contact events in real-time.'
})
  .input(
    z.object({
      eventType: z
        .enum(['batch_completed', 'contact_finished'])
        .describe('Whether this is a batch completion or individual contact event'),
      enrichmentId: z.string().describe('Enrichment batch ID'),
      batchName: z.string().optional().describe('Name of the enrichment batch'),
      status: z
        .string()
        .optional()
        .describe('Batch status (FINISHED, CANCELED, CREDITS_INSUFFICIENT, etc.)'),
      contacts: z
        .array(contactResultSchema)
        .optional()
        .describe('Enriched contacts (for batch completion)'),
      contact: contactResultSchema
        .optional()
        .describe('Single enriched contact (for contact_finished events)'),
      creditsUsed: z.number().optional().describe('Credits consumed'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Enrichment batch ID'),
      batchName: z.string().optional().describe('Name of the enrichment batch'),
      status: z.string().optional().describe('Batch status'),
      contacts: z.array(contactResultSchema).describe('Enriched contacts with found data'),
      creditsUsed: z.number().optional().describe('Credits consumed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let mapContact = (entry: any) => {
        let contact = entry.contact ?? entry;
        return {
          firstname: contact.firstname,
          lastname: contact.lastname,
          domain: contact.domain,
          mostProbableEmail: contact.most_probable_email,
          mostProbableEmailStatus: contact.most_probable_email_status,
          mostProbablePhone: contact.most_probable_phone,
          emails: contact.emails,
          phones: contact.phones,
          custom: entry.custom ?? contact.custom,
          linkedinUrl: contact.profile?.linkedin_url,
          headline: contact.profile?.headline,
          currentTitle: contact.profile?.position?.title,
          currentCompany: contact.profile?.company?.name
        };
      };

      // Determine if this is a batch or individual contact event
      let url = new URL(ctx.request.url);
      let isContactFinished = url.pathname.endsWith('/contact');

      if (isContactFinished) {
        // Individual contact finished event
        let contact = mapContact(data);
        return {
          inputs: [
            {
              eventType: 'contact_finished' as const,
              enrichmentId: data.enrichment_id ?? data.id ?? 'unknown',
              batchName: data.name,
              status: data.status,
              contact,
              contacts: undefined,
              creditsUsed: data.cost?.credits,
              rawPayload: data
            }
          ]
        };
      }

      // Batch completion event
      let contacts = (data.datas ?? data.data ?? []).map(mapContact);

      return {
        inputs: [
          {
            eventType: 'batch_completed' as const,
            enrichmentId: data.id ?? data.enrichment_id ?? 'unknown',
            batchName: data.name,
            status: data.status,
            contacts,
            contact: undefined,
            creditsUsed: data.cost?.credits,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let contacts: z.infer<typeof contactResultSchema>[] = [];

      if (ctx.input.eventType === 'contact_finished' && ctx.input.contact) {
        contacts = [ctx.input.contact];
      } else if (ctx.input.contacts) {
        contacts = ctx.input.contacts;
      }

      return {
        type: `enrichment.${ctx.input.eventType}`,
        id:
          ctx.input.eventType === 'contact_finished'
            ? `${ctx.input.enrichmentId}-${ctx.input.contact?.mostProbableEmail ?? ctx.input.contact?.firstname ?? Date.now()}`
            : ctx.input.enrichmentId,
        output: {
          enrichmentId: ctx.input.enrichmentId,
          batchName: ctx.input.batchName,
          status: ctx.input.status,
          contacts,
          creditsUsed: ctx.input.creditsUsed
        }
      };
    }
  })
  .build();
