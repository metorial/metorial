import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Loops MCP Server
 * Provides tools and resources for interacting with Loops API
 * https://loops.so/docs/api-reference
 */

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'loops-mcp-server',
    version: '1.0.0'
  },
  async (server, cfg) => {
    // Base Loops API URL
    const LOOPS_API_BASE = 'https://app.loops.so/api/v1';

    /**
     * Helper function to make Loops API requests
     */
    async function loopsRequest(
      endpoint: string,
      method: string = 'GET',
      body?: any
    ): Promise<any> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const url =
        method === 'GET' && body
          ? `${LOOPS_API_BASE}${endpoint}?${new URLSearchParams(body).toString()}`
          : `${LOOPS_API_BASE}${endpoint}`;

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Loops API Error (${response.status}): ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ============================================================================
    // CONTACT MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'create_contact',
      {
        title: 'Create Contact',
        description: 'Create a new contact in Loops',
        inputSchema: {
          email: z.string().email().describe('Contact email address (required)'),
          firstName: z.string().optional().nullable().describe('First name'),
          lastName: z.string().optional().nullable().describe('Last name'),
          source: z.string().optional().nullable().describe('Contact source'),
          subscribed: z.boolean().nullable().optional().describe('Subscription status'),
          userGroup: z.string().optional().nullable().describe('User group'),
          userId: z.string().optional().nullable().describe('Custom user ID'),
          customFields: z
            .record(z.any())
            .optional()
            .nullable()
            .describe('Custom fields as key-value pairs')
        }
      },
      async ({
        email,
        firstName,
        lastName,
        source,
        subscribed,
        userGroup,
        userId,
        customFields
      }) => {
        const body: any = { email };
        if (firstName) body.firstName = firstName;
        if (lastName) body.lastName = lastName;
        if (source) body.source = source;
        if (subscribed !== undefined) body.subscribed = subscribed;
        if (userGroup) body.userGroup = userGroup;
        if (userId) body.userId = userId;
        if (customFields) {
          Object.assign(body, customFields);
        }

        const result = await loopsRequest('/contacts/create', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Contact created successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_contact',
      {
        title: 'Update Contact',
        description: 'Update an existing contact',
        inputSchema: {
          email: z.string().email().describe('Contact email address'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          subscribed: z.boolean().optional().describe('Subscription status'),
          userGroup: z.string().optional().describe('User group'),
          userId: z.string().optional().describe('Custom user ID'),
          customFields: z
            .record(z.any())
            .optional()
            .describe('Custom fields as key-value pairs')
        }
      },
      async ({ email, firstName, lastName, subscribed, userGroup, userId, customFields }) => {
        const body: any = { email };
        if (firstName) body.firstName = firstName;
        if (lastName) body.lastName = lastName;
        if (subscribed !== undefined) body.subscribed = subscribed;
        if (userGroup) body.userGroup = userGroup;
        if (userId) body.userId = userId;
        if (customFields) {
          Object.assign(body, customFields);
        }

        const result = await loopsRequest('/contacts/update', 'PUT', body);

        return {
          content: [
            {
              type: 'text',
              text: `Contact updated successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'find_contact',
      {
        title: 'Find Contact',
        description: 'Find a contact by email or user ID',
        inputSchema: {
          email: z.string().optional().describe('Contact email address'),
          userId: z.string().optional().describe('Custom user ID')
        }
      },
      async ({ email, userId }) => {
        const params: any = {};
        if (email) params.email = email;
        if (userId) params.userId = userId;

        const result = await loopsRequest('/contacts/find', 'GET', params);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_contact',
      {
        title: 'Delete Contact',
        description: 'Delete a contact by email or user ID',
        inputSchema: {
          email: z.string().optional().describe('Contact email address'),
          userId: z.string().optional().describe('Custom user ID')
        }
      },
      async ({ email, userId }) => {
        const body: any = {};
        if (email) body.email = email;
        if (userId) body.userId = userId;

        const result = await loopsRequest('/contacts/delete', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Contact deleted successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // MAILING LIST TOOLS
    // ============================================================================

    server.registerTool(
      'get_mailing_lists',
      {
        title: 'Get Mailing Lists',
        description: 'Get all mailing lists',
        inputSchema: {}
      },
      async () => {
        const result = await loopsRequest('/lists', 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TRANSACTIONAL EMAIL TOOLS
    // ============================================================================

    server.registerTool(
      'send_transactional_email',
      {
        title: 'Send Transactional Email',
        description: 'Send a transactional email using a template',
        inputSchema: {
          transactionalId: z.string().describe('Transactional email template ID'),
          email: z.string().email().describe('Recipient email address'),
          dataVariables: z
            .record(z.any())
            .optional()
            .describe('Template variables as key-value pairs'),
          addToAudience: z
            .boolean()
            .optional()
            .describe('Add recipient to audience (default: false)'),
          mailingLists: z
            .array(z.string())
            .optional()
            .describe('Array of mailing list IDs to add recipient to')
        }
      },
      async ({ transactionalId, email, dataVariables, addToAudience, mailingLists }) => {
        const body: any = {
          transactionalId,
          email
        };

        if (dataVariables) body.dataVariables = dataVariables;
        if (addToAudience !== undefined) body.addToAudience = addToAudience;
        if (mailingLists) body.mailingLists = mailingLists;

        const result = await loopsRequest('/transactional', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Transactional email sent successfully\n\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // EVENT TOOLS
    // ============================================================================

    server.registerTool(
      'send_event',
      {
        title: 'Send Event',
        description: 'Send a custom event for a contact',
        inputSchema: {
          email: z.string().optional().describe('Contact email address'),
          userId: z.string().optional().describe('Contact user ID'),
          eventName: z.string().describe('Event name'),
          contactProperties: z
            .record(z.any())
            .optional()
            .describe('Contact properties to update'),
          eventProperties: z.record(z.any()).optional().describe('Event properties'),
          mailingLists: z
            .array(z.string())
            .optional()
            .describe('Mailing lists to add contact to')
        }
      },
      async ({
        email,
        userId,
        eventName,
        contactProperties,
        eventProperties,
        mailingLists
      }) => {
        const body: any = {
          eventName
        };

        if (email) body.email = email;
        if (userId) body.userId = userId;
        if (contactProperties) body.contactProperties = contactProperties;
        if (eventProperties) body.eventProperties = eventProperties;
        if (mailingLists) body.mailingLists = mailingLists;

        const result = await loopsRequest('/events/send', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Event sent successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // CUSTOM FIELD TOOLS
    // ============================================================================

    server.registerTool(
      'get_custom_fields',
      {
        title: 'Get Custom Fields',
        description: 'Get all custom fields',
        inputSchema: {}
      },
      async () => {
        const result = await loopsRequest('/contacts/customFields', 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // API KEY TOOLS
    // ============================================================================

    server.registerTool(
      'test_api_key',
      {
        title: 'Test API Key',
        description: 'Test if the API key is valid',
        inputSchema: {}
      },
      async () => {
        const result = await loopsRequest('/api-key', 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    server.registerResource(
      'contact_info',
      new ResourceTemplate('loops://contact/{identifier}', { list: undefined }),
      {
        title: 'Contact Information',
        description: 'Access detailed information about a specific contact by email or user ID'
      },
      async (uri, { identifier }) => {
        const decodedIdentifier = decodeURIComponent(identifier as string);

        // Try to determine if it's an email or user ID
        const isEmail = decodedIdentifier.includes('@');
        const params: any = {};

        if (isEmail) {
          params.email = decodedIdentifier;
        } else {
          params.userId = decodedIdentifier;
        }

        const result = await loopsRequest('/contacts/find', 'GET', params);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerResource(
      'mailing_lists',
      new ResourceTemplate('loops://lists', { list: undefined }),
      {
        title: 'Mailing Lists',
        description: 'Access all mailing lists'
      },
      async uri => {
        const result = await loopsRequest('/lists', 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerResource(
      'custom_fields',
      new ResourceTemplate('loops://custom-fields', { list: undefined }),
      {
        title: 'Custom Fields',
        description: 'Access all custom fields defined in Loops'
      },
      async uri => {
        const result = await loopsRequest('/contacts/customFields', 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerResource(
      'api_key_info',
      new ResourceTemplate('loops://api-key', { list: undefined }),
      {
        title: 'API Key Information',
        description: 'Access information about the current API key'
      },
      async uri => {
        const result = await loopsRequest('/api-key', 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );
  }
);
