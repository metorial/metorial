import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when a document is parsed or validated in Affinda. Covers both document.parse.completed and document.validate.completed events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (e.g., "document.parse.completed", "document.validate.completed").'
        ),
      documentIdentifier: z.string().describe('Identifier of the affected document.'),
      fileName: z.string().optional().describe('Name of the document file.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe('Workspace the document belongs to.'),
      workspaceName: z.string().optional().describe('Name of the workspace.'),
      collectionIdentifier: z
        .string()
        .optional()
        .describe('Collection the document belongs to.'),
      customIdentifier: z.string().optional().describe('Custom identifier of the document.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Identifier of the affected document.'),
      fileName: z.string().optional().describe('Name of the document file.'),
      workspaceIdentifier: z.string().optional().describe('Workspace identifier.'),
      workspaceName: z.string().optional().describe('Name of the workspace.'),
      collectionIdentifier: z.string().optional().describe('Collection identifier.'),
      customIdentifier: z.string().optional().describe('Custom identifier.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      // Get the first organization to register webhook at org level
      let orgs = await client.listOrganizations();
      let orgList = Array.isArray(orgs) ? orgs : (orgs.results ?? []);
      let orgIdentifier = orgList[0]?.identifier;

      if (!orgIdentifier) {
        throw new Error(
          'No organization found. An organization is required to register webhooks.'
        );
      }

      // Register webhook for parse completed
      let parseSubscription = await client.createResthookSubscription({
        targetUrl: `${ctx.input.webhookBaseUrl}/parse`,
        event: 'document.parse.completed',
        organization: orgIdentifier,
        version: 'v3'
      });

      // Register webhook for validate completed
      let validateSubscription = await client.createResthookSubscription({
        targetUrl: `${ctx.input.webhookBaseUrl}/validate`,
        event: 'document.validate.completed',
        organization: orgIdentifier,
        version: 'v3'
      });

      return {
        registrationDetails: {
          parseSubscriptionId: parseSubscription.id,
          validateSubscriptionId: validateSubscription.id,
          organizationIdentifier: orgIdentifier
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let details = ctx.input.registrationDetails as {
        parseSubscriptionId?: number;
        validateSubscriptionId?: number;
      };

      if (details.parseSubscriptionId) {
        await client.deleteResthookSubscription(details.parseSubscriptionId).catch(() => {});
      }
      if (details.validateSubscriptionId) {
        await client
          .deleteResthookSubscription(details.validateSubscriptionId)
          .catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let request = ctx.request;

      // Handle subscription activation: Affinda sends X-Hook-Secret header for confirmation
      let hookSecret = request.headers.get('X-Hook-Secret');
      if (hookSecret) {
        // Activation request — respond but don't emit events
        // The activation will need to be completed via the activate endpoint
        let client = new Client({
          token: ctx.auth.token,
          region: ctx.config.region
        });

        try {
          await client.activateResthookSubscription(hookSecret);
        } catch (_e) {
          // Activation may already be done or will be retried
        }

        return { inputs: [] };
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return { inputs: [] };
      }

      // Determine event type from URL path or payload
      let url = new URL(request.url);
      let eventType = 'document.parse.completed';
      if (url.pathname.endsWith('/validate')) {
        eventType = 'document.validate.completed';
      }

      // The webhook payload contains document metadata
      let doc = body.document ?? body;

      let input = {
        eventType,
        documentIdentifier: doc.identifier ?? doc.meta?.identifier ?? '',
        fileName: doc.fileName ?? doc.meta?.fileName,
        workspaceIdentifier: doc.workspace?.identifier,
        workspaceName: doc.workspace?.name,
        collectionIdentifier: doc.collection?.identifier,
        customIdentifier: doc.customIdentifier ?? doc.meta?.customIdentifier
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.documentIdentifier}-${Date.now()}`,
        output: {
          documentIdentifier: ctx.input.documentIdentifier,
          fileName: ctx.input.fileName,
          workspaceIdentifier: ctx.input.workspaceIdentifier,
          workspaceName: ctx.input.workspaceName,
          collectionIdentifier: ctx.input.collectionIdentifier,
          customIdentifier: ctx.input.customIdentifier
        }
      };
    }
  })
  .build();
