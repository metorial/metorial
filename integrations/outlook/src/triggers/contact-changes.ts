import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts are created, updated, or deleted. Subscribes to Microsoft Graph webhook notifications for contact changes.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change that occurred'),
      resourceUri: z.string().describe('Resource path of the changed contact'),
      contactId: z.string().describe('ID of the affected contact'),
      subscriptionId: z.string().describe('ID of the subscription'),
      tenantId: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      displayName: z.string().optional(),
      givenName: z.string().optional(),
      surname: z.string().optional(),
      emailAddresses: z
        .array(
          z.object({
            address: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      businessPhones: z.array(z.string()).optional(),
      mobilePhone: z.string().optional(),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      lastModifiedDateTime: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 - 60000
      ).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: 'me/contacts',
        expirationDateTime,
        clientState: 'slates-contact-changes'
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          expirationDateTime: subscription.expirationDateTime
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { subscriptionId: string };
      await client.deleteSubscription(details.subscriptionId);
    },

    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let validationToken = url.searchParams.get('validationToken');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        };
      }

      let body = (await ctx.request.json()) as {
        value: Array<{
          changeType: 'created' | 'updated' | 'deleted';
          resource: string;
          resourceData?: { id: string; '@odata.type'?: string };
          subscriptionId: string;
          clientState?: string;
          tenantId?: string;
        }>;
      };

      if (!body?.value?.length) {
        return { inputs: [] };
      }

      let notifications = body.value.filter(n => n.clientState === 'slates-contact-changes');

      let inputs = notifications
        .filter(n => n.resourceData?.id)
        .map(n => ({
          changeType: n.changeType,
          resourceUri: n.resource,
          contactId: n.resourceData!.id,
          subscriptionId: n.subscriptionId,
          tenantId: n.tenantId
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let { changeType, contactId } = ctx.input;

      if (changeType === 'deleted') {
        return {
          type: `contact.${changeType}`,
          id: `${contactId}-${changeType}-${Date.now()}`,
          output: {
            contactId
          }
        };
      }

      try {
        let client = new Client({ token: ctx.auth.token });
        let contact = await client.getContact(contactId);

        return {
          type: `contact.${changeType}`,
          id: `${contactId}-${changeType}-${contact.lastModifiedDateTime || Date.now()}`,
          output: {
            contactId: contact.id,
            displayName: contact.displayName,
            givenName: contact.givenName,
            surname: contact.surname,
            emailAddresses: contact.emailAddresses?.map(e => ({
              address: e.address,
              name: e.name
            })),
            businessPhones: contact.businessPhones,
            mobilePhone: contact.mobilePhone,
            jobTitle: contact.jobTitle,
            companyName: contact.companyName,
            lastModifiedDateTime: contact.lastModifiedDateTime
          }
        };
      } catch {
        return {
          type: `contact.${changeType}`,
          id: `${contactId}-${changeType}-${Date.now()}`,
          output: {
            contactId
          }
        };
      }
    }
  })
  .build();
