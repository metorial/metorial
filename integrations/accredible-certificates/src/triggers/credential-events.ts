import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let credentialEvents = SlateTrigger.create(spec, {
  name: 'Credential Events',
  key: 'credential_events',
  description:
    'Triggers when credentials are created or updated. Polls for new and recently updated credentials.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of credential event'),
      credentialId: z.string().describe('ID of the affected credential'),
      credential: z.any().describe('Full credential data from the API')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the credential'),
      credentialName: z.string().optional().describe('Name of the credential'),
      credentialUrl: z.string().optional().describe('Public URL to view the credential'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      groupName: z.string().optional().describe('Credential group name'),
      groupId: z.number().optional().describe('Credential group ID'),
      issuedOn: z.string().optional().describe('Issue date'),
      expiredOn: z.string().optional().describe('Expiry date'),
      approved: z.boolean().optional().describe('Whether the credential is published'),
      isComplete: z.boolean().optional().describe('Whether the credential is complete'),
      issuerName: z.string().optional().describe('Issuer organization name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPollDate = ctx.state?.lastPollDate as string | undefined;
      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];

      let now = new Date().toISOString().split('T')[0];

      // Fetch recently created/updated credentials
      let searchParams: any = {
        pageSize: 50,
        page: 1
      };

      if (lastPollDate) {
        searchParams.startUpdatedDate = lastPollDate;
      }

      let result = await client.searchCredentials(searchParams);
      let inputs: Array<{
        eventType: 'created' | 'updated';
        credentialId: string;
        credential: any;
      }> = [];
      let newSeenIds: string[] = [];

      for (let credential of result.credentials) {
        let credId = String(credential.id);
        newSeenIds.push(credId);

        if (seenIds.includes(credId)) {
          // Was seen before, this is an update
          inputs.push({
            eventType: 'updated',
            credentialId: credId,
            credential
          });
        } else {
          // First time seeing this, it's new
          inputs.push({
            eventType: 'created',
            credentialId: credId,
            credential
          });
        }
      }

      // On first poll, don't emit events (just establish baseline)
      if (!lastPollDate) {
        return {
          inputs: [],
          updatedState: {
            lastPollDate: now,
            seenIds: newSeenIds
          }
        };
      }

      return {
        inputs,
        updatedState: {
          lastPollDate: now,
          seenIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.credential;

      return {
        type: `credential.${ctx.input.eventType}`,
        id: `${ctx.input.credentialId}-${ctx.input.eventType}-${c.updated_at || c.issued_on || Date.now()}`,
        output: {
          credentialId: ctx.input.credentialId,
          credentialName: c.name,
          credentialUrl: c.url,
          recipientName: c.recipient?.name,
          recipientEmail: c.recipient?.email,
          groupName: c.group_name,
          groupId: c.group_id,
          issuedOn: c.issued_on,
          expiredOn: c.expired_on,
          approved: c.approve,
          isComplete: c.complete,
          issuerName: c.issuer?.name
        }
      };
    }
  })
  .build();
