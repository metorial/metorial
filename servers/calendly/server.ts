import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Calendly MCP Server
 * Provides tools and resources for interacting with the Calendly API
 */

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'calendly',
    version: '1.0.0'
  },
  async (server, config) => {
    // Base URL for Calendly API
    const CALENDLY_API_BASE = 'https://api.calendly.com';

    /**
     * Helper function to make authenticated requests to Calendly API
     */
    async function calendlyRequest<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const url = endpoint.startsWith('http') ? endpoint : `${CALENDLY_API_BASE}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Calendly API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    /**
     * Extract UUID from Calendly URI
     */
    function extractUuid(uri: string): string {
      const parts = uri.split('/');
      return parts[parts.length - 1] as string;
    }

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Current User
     * Get information about the authenticated user
     */
    server.registerResource(
      'current-user',
      new ResourceTemplate('calendly://user/me', { list: undefined }),
      {
        title: 'Current User',
        description: 'Get information about the authenticated Calendly user'
      },
      async uri => {
        const response = await calendlyRequest<any>('/users/me');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response.resource, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Organization
     * Get details about a specific organization
     */
    server.registerResource(
      'organization',
      new ResourceTemplate('calendly://organization/{organization_uuid}', { list: undefined }),
      {
        title: 'Organization',
        description: 'Get details about a specific Calendly organization'
      },
      async (uri, { organization_uuid }) => {
        const response = await calendlyRequest<any>(
          `https://api.calendly.com/organizations/${organization_uuid}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response.resource, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Event Type
     * Get details about a specific event type
     */
    server.registerResource(
      'event-type',
      new ResourceTemplate('calendly://event-type/{event_type_uuid}', { list: undefined }),
      {
        title: 'Event Type',
        description: 'Get details about a specific event type'
      },
      async (uri, { event_type_uuid }) => {
        const response = await calendlyRequest<any>(`/event_types/${event_type_uuid}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response.resource, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Scheduled Event
     * Get details about a specific scheduled event
     */
    server.registerResource(
      'scheduled-event',
      new ResourceTemplate('calendly://event/{event_uuid}', { list: undefined }),
      {
        title: 'Scheduled Event',
        description: 'Get details about a specific scheduled event'
      },
      async (uri, { event_uuid }) => {
        const response = await calendlyRequest<any>(`/scheduled_events/${event_uuid}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response.resource, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Event Invitee
     * Get details about a specific invitee
     */
    server.registerResource(
      'event-invitee',
      new ResourceTemplate('calendly://invitee/{invitee_uuid}', { list: undefined }),
      {
        title: 'Event Invitee',
        description: 'Get details about a specific event invitee'
      },
      async (uri, { invitee_uuid }) => {
        const response = await calendlyRequest<any>(
          `/scheduled_events/${invitee_uuid}/invitees`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Webhook Subscription
     * Get details about a specific webhook
     */
    server.registerResource(
      'webhook',
      new ResourceTemplate('calendly://webhook/{webhook_uuid}', { list: undefined }),
      {
        title: 'Webhook Subscription',
        description: 'Get details about a specific webhook subscription'
      },
      async (uri, { webhook_uuid }) => {
        const response = await calendlyRequest<any>(`/webhook_subscriptions/${webhook_uuid}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(response.resource, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Tool: List Event Types
     * List all event types for a user or organization
     */
    server.registerTool(
      'list_event_types',
      {
        title: 'List Event Types',
        description: 'List all event types for a user or organization',
        inputSchema: {
          user_uri: z.string().optional().describe('Filter by user URI'),
          organization_uri: z.string().optional().describe('Filter by organization URI'),
          active: z.boolean().optional().describe('Filter by active status'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({ user_uri, organization_uri, active, count }) => {
        const params = new URLSearchParams();

        if (user_uri) params.append('user', user_uri);
        if (organization_uri) params.append('organization', organization_uri);
        if (active !== undefined) params.append('active', String(active));
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(`/event_types?${params.toString()}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: List Scheduled Events
     * List scheduled events with optional filters
     */
    server.registerTool(
      'list_scheduled_events',
      {
        title: 'List Scheduled Events',
        description: 'List scheduled events with optional filters',
        inputSchema: {
          user_uri: z.string().optional().describe('Filter by user URI'),
          organization_uri: z.string().optional().describe('Filter by organization URI'),
          invitee_email: z.string().optional().describe('Filter by invitee email'),
          status: z.enum(['active', 'canceled']).optional().describe('Filter by status'),
          min_start_time: z
            .string()
            .optional()
            .describe('Minimum start time (ISO 8601 format)'),
          max_start_time: z
            .string()
            .optional()
            .describe('Maximum start time (ISO 8601 format)'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({
        user_uri,
        organization_uri,
        invitee_email,
        status,
        min_start_time,
        max_start_time,
        count
      }) => {
        const params = new URLSearchParams();

        if (user_uri) params.append('user', user_uri);
        if (organization_uri) params.append('organization', organization_uri);
        if (invitee_email) params.append('invitee_email', invitee_email);
        if (status) params.append('status', status);
        if (min_start_time) params.append('min_start_time', min_start_time);
        if (max_start_time) params.append('max_start_time', max_start_time);
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(`/scheduled_events?${params.toString()}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: List Event Invitees
     * List invitees for a specific event
     */
    server.registerTool(
      'list_event_invitees',
      {
        title: 'List Event Invitees',
        description: 'List invitees for a specific scheduled event',
        inputSchema: {
          event_uuid: z.string().describe('UUID of the scheduled event'),
          email: z.string().optional().describe('Filter by invitee email'),
          status: z.string().optional().describe('Filter by invitee status'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({ event_uuid, email, status, count }) => {
        const params = new URLSearchParams();

        if (email) params.append('email', email);
        if (status) params.append('status', status);
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(
          `/scheduled_events/${event_uuid}/invitees?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Cancel Scheduled Event
     * Cancel a scheduled event
     */
    server.registerTool(
      'cancel_scheduled_event',
      {
        title: 'Cancel Scheduled Event',
        description: 'Cancel a scheduled event',
        inputSchema: {
          event_uuid: z.string().describe('UUID of the event to cancel'),
          reason: z.string().optional().describe('Reason for cancellation')
        }
      },
      async ({ event_uuid, reason }) => {
        const body: any = {};
        if (reason) body.reason = reason;

        const response = await calendlyRequest<any>(
          `/scheduled_events/${event_uuid}/cancellation`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create Single Use Scheduling Link
     * Create a single-use scheduling link for an event type
     */
    server.registerTool(
      'create_single_use_scheduling_link',
      {
        title: 'Create Single Use Scheduling Link',
        description: 'Create a single-use scheduling link for an event type',
        inputSchema: {
          event_type_uri: z.string().describe('URI of the event type'),
          max_event_count: z
            .number()
            .optional()
            .default(1)
            .describe('Maximum number of events that can be scheduled'),
          owner_uri: z.string().describe('URI of the event owner')
        }
      },
      async ({ event_type_uri, max_event_count, owner_uri }) => {
        const body = {
          max_event_count: max_event_count || 1,
          owner: owner_uri,
          owner_type: 'EventType',
          resource_uri: event_type_uri
        };

        const response = await calendlyRequest<any>('/scheduling_links', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: List Webhooks
     * List all webhook subscriptions for an organization
     */
    server.registerTool(
      'list_webhooks',
      {
        title: 'List Webhooks',
        description: 'List all webhook subscriptions for an organization',
        inputSchema: {
          organization_uri: z.string().describe('URI of the organization'),
          scope: z.enum(['organization', 'user']).optional().describe('Filter by scope'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({ organization_uri, scope, count }) => {
        const params = new URLSearchParams();

        params.append('organization', organization_uri);
        if (scope) params.append('scope', scope);
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(
          `/webhook_subscriptions?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create Webhook
     * Create a new webhook subscription
     */
    server.registerTool(
      'create_webhook',
      {
        title: 'Create Webhook',
        description: 'Create a new webhook subscription',
        inputSchema: {
          organization_uri: z.string().describe('URI of the organization'),
          url: z.string().describe('The callback URL for webhook events'),
          events: z
            .array(z.string())
            .describe(
              'Array of event types to subscribe to (e.g., ["invitee.created", "invitee.canceled"])'
            ),
          signing_key: z.string().describe('Secret key for webhook signature verification'),
          scope: z
            .enum(['organization', 'user'])
            .optional()
            .default('organization')
            .describe('Scope of the webhook')
        }
      },
      async ({ organization_uri, url, events, signing_key, scope }) => {
        const body = {
          url,
          events,
          organization: organization_uri,
          scope: scope || 'organization',
          signing_key
        };

        const response = await calendlyRequest<any>('/webhook_subscriptions', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Delete Webhook
     * Delete a webhook subscription
     */
    server.registerTool(
      'delete_webhook',
      {
        title: 'Delete Webhook',
        description: 'Delete a webhook subscription',
        inputSchema: {
          webhook_uuid: z.string().describe('UUID of the webhook to delete')
        }
      },
      async ({ webhook_uuid }) => {
        await calendlyRequest<any>(`/webhook_subscriptions/${webhook_uuid}`, {
          method: 'DELETE'
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: 'Webhook deleted successfully' },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: Get User Availability Schedules
     * List availability schedules for a user
     */
    server.registerTool(
      'get_user_availability_schedules',
      {
        title: 'Get User Availability Schedules',
        description: 'List availability schedules for a user',
        inputSchema: {
          user_uri: z.string().describe('URI of the user'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({ user_uri, count }) => {
        const params = new URLSearchParams();

        params.append('user', user_uri);
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(
          `/user_availability_schedules?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: List Organization Memberships
     * List memberships for an organization
     */
    server.registerTool(
      'list_organization_memberships',
      {
        title: 'List Organization Memberships',
        description: 'List memberships for an organization',
        inputSchema: {
          organization_uri: z.string().describe('URI of the organization'),
          email: z.string().optional().describe('Filter by member email'),
          count: z
            .number()
            .optional()
            .default(20)
            .describe('Number of results per page (default: 20)')
        }
      },
      async ({ organization_uri, email, count }) => {
        const params = new URLSearchParams();

        // Extract UUID from organization URI
        const orgUuid = extractUuid(organization_uri);

        if (email) params.append('email', email);
        if (count) params.append('count', String(count));

        const response = await calendlyRequest<any>(
          `/organizations/${orgUuid}/memberships?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Get Event Type Available Times
     * Get available times for a specific event type
     */
    server.registerTool(
      'get_event_type_available_times',
      {
        title: 'Get Event Type Available Times',
        description: 'Get available times for booking a specific event type',
        inputSchema: {
          event_type_uri: z.string().describe('URI of the event type'),
          start_time: z.string().describe('Start of the time range (ISO 8601 format)'),
          end_time: z.string().describe('End of the time range (ISO 8601 format)')
        }
      },
      async ({ event_type_uri, start_time, end_time }) => {
        const params = new URLSearchParams();

        params.append('event_type', event_type_uri);
        params.append('start_time', start_time);
        params.append('end_time', end_time);

        const response = await calendlyRequest<any>(
          `/event_type_available_times?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );
  }
);
