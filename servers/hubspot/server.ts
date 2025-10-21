import { metorial, z } from '@metorial/mcp-server-sdk';

// Helper to generate PKCE code verifier and challenge
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'tickets',
      'crm.objects.quotes.read',
      'crm.objects.quotes.write',
      'sales-email-read',
      'crm.schemas.contacts.read',
      'crm.schemas.companies.read',
      'crm.schemas.deals.read',
      'crm.objects.owners.read',
      'crm.lists.read',
      'crm.lists.write',
      'forms',
      'timeline',
      'content',
      'automation',
      'oauth'
    ].join('%20');

    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      scope: scopes,
      state: input.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://app.hubspot.com/oauth/authorize?${params.toString()}`,
      codeVerifier: codeVerifier
    };
  },
  handleCallback: async input => {
    try {
      const url = new URL(input.fullUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        code: code,
        code_verifier: input.codeVerifier!
      });

      const tokenResponse: any = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken
      });

      const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData: any = await tokenResponse.json();

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || input.refreshToken,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<{
  token: string;
}>(
  {
    name: 'hubspot-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make HubSpot API calls
    async function makeHubSpotRequest(endpoint: string, method: string = 'GET', body?: any) {
      const url = `https://api.hubapi.com${endpoint}`;

      const options: any = {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ==================== CONTACT TOOLS ====================

    server.registerTool(
      'list_contacts',
      {
        title: 'List Contacts',
        description: 'List contacts from HubSpot CRM',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .describe('Number of contacts to return (default: 100, max: 100)'),
          properties: z.array(z.string()).optional().describe('Specific properties to return'),
          archived: z
            .boolean()
            .optional()
            .describe('Include archived contacts (default: false)')
        }
      },
      async ({ limit = 100, properties, archived = false }) => {
        let endpoint = `/crm/v3/objects/contacts?limit=${limit}&archived=${archived}`;
        if (properties && properties.length > 0) {
          endpoint += `&properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_contacts',
      {
        title: 'Search Contacts',
        description: 'Search contacts using filters',
        inputSchema: {
          filterGroups: z
            .array(
              z.object({
                filters: z.array(
                  z.object({
                    propertyName: z.string(),
                    operator: z.string(),
                    value: z.string()
                  })
                )
              })
            )
            .describe(
              'Filter groups (e.g., [{filters: [{propertyName: "email", operator: "EQ", value: "test@example.com"}]}])'
            ),
          properties: z.array(z.string()).optional().describe('Properties to return'),
          limit: z.number().optional().describe('Number of results (default: 100)')
        }
      },
      async ({ filterGroups, properties, limit = 100 }) => {
        const searchBody: any = {
          filterGroups,
          limit
        };

        if (properties && properties.length > 0) {
          searchBody.properties = properties;
        }

        const result = await makeHubSpotRequest(
          '/crm/v3/objects/contacts/search',
          'POST',
          searchBody
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_contact',
      {
        title: 'Get Contact',
        description: 'Get a specific contact by ID',
        inputSchema: {
          contactId: z.string().describe('Contact ID'),
          properties: z.array(z.string()).optional().describe('Specific properties to return')
        }
      },
      async ({ contactId, properties }) => {
        let endpoint = `/crm/v3/objects/contacts/${contactId}`;
        if (properties && properties.length > 0) {
          endpoint += `?properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_contact',
      {
        title: 'Create Contact',
        description: 'Create a new contact in HubSpot',
        inputSchema: {
          email: z.string().describe('Contact email (required)'),
          firstname: z.string().optional().describe('First name'),
          lastname: z.string().optional().describe('Last name'),
          phone: z.string().optional().describe('Phone number'),
          company: z.string().optional().describe('Company name'),
          website: z.string().optional().describe('Website'),
          lifecyclestage: z.string().optional().describe('Lifecycle stage'),
          additionalProperties: z
            .record(z.string())
            .optional()
            .describe('Additional custom properties')
        }
      },
      async input => {
        const properties: any = {
          email: input.email
        };

        if (input.firstname) properties.firstname = input.firstname;
        if (input.lastname) properties.lastname = input.lastname;
        if (input.phone) properties.phone = input.phone;
        if (input.company) properties.company = input.company;
        if (input.website) properties.website = input.website;
        if (input.lifecyclestage) properties.lifecyclestage = input.lifecyclestage;

        if (input.additionalProperties) {
          Object.assign(properties, input.additionalProperties);
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/contacts', 'POST', {
          properties
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_contact',
      {
        title: 'Update Contact',
        description: 'Update an existing contact',
        inputSchema: {
          contactId: z.string().describe('Contact ID'),
          properties: z.record(z.string()).describe('Properties to update (key-value pairs)')
        }
      },
      async ({ contactId, properties }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/contacts/${contactId}`,
          'PATCH',
          { properties }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_contact',
      {
        title: 'Delete Contact',
        description: 'Delete a contact (move to recycling bin)',
        inputSchema: {
          contactId: z.string().describe('Contact ID to delete')
        }
      },
      async ({ contactId }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/contacts/${contactId}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: contactId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== COMPANY TOOLS ====================

    server.registerTool(
      'list_companies',
      {
        title: 'List Companies',
        description: 'List companies from HubSpot CRM',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .describe('Number of companies to return (default: 100, max: 100)'),
          properties: z.array(z.string()).optional().describe('Specific properties to return'),
          archived: z
            .boolean()
            .optional()
            .describe('Include archived companies (default: false)')
        }
      },
      async ({ limit = 100, properties, archived = false }) => {
        let endpoint = `/crm/v3/objects/companies?limit=${limit}&archived=${archived}`;
        if (properties && properties.length > 0) {
          endpoint += `&properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_companies',
      {
        title: 'Search Companies',
        description: 'Search companies using filters',
        inputSchema: {
          filterGroups: z
            .array(
              z.object({
                filters: z.array(
                  z.object({
                    propertyName: z.string(),
                    operator: z.string(),
                    value: z.string()
                  })
                )
              })
            )
            .describe('Filter groups'),
          properties: z.array(z.string()).optional().describe('Properties to return'),
          limit: z.number().optional().describe('Number of results (default: 100)')
        }
      },
      async ({ filterGroups, properties, limit = 100 }) => {
        const searchBody: any = {
          filterGroups,
          limit
        };

        if (properties && properties.length > 0) {
          searchBody.properties = properties;
        }

        const result = await makeHubSpotRequest(
          '/crm/v3/objects/companies/search',
          'POST',
          searchBody
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_company',
      {
        title: 'Get Company',
        description: 'Get a specific company by ID',
        inputSchema: {
          companyId: z.string().describe('Company ID'),
          properties: z.array(z.string()).optional().describe('Specific properties to return')
        }
      },
      async ({ companyId, properties }) => {
        let endpoint = `/crm/v3/objects/companies/${companyId}`;
        if (properties && properties.length > 0) {
          endpoint += `?properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_company',
      {
        title: 'Create Company',
        description: 'Create a new company in HubSpot',
        inputSchema: {
          name: z.string().describe('Company name (required)'),
          domain: z.string().optional().describe('Company domain'),
          city: z.string().optional().describe('City'),
          industry: z.string().optional().describe('Industry'),
          phone: z.string().optional().describe('Phone number'),
          state: z.string().optional().describe('State'),
          lifecyclestage: z.string().optional().describe('Lifecycle stage'),
          additionalProperties: z
            .record(z.string())
            .optional()
            .describe('Additional custom properties')
        }
      },
      async input => {
        const properties: any = {
          name: input.name
        };

        if (input.domain) properties.domain = input.domain;
        if (input.city) properties.city = input.city;
        if (input.industry) properties.industry = input.industry;
        if (input.phone) properties.phone = input.phone;
        if (input.state) properties.state = input.state;
        if (input.lifecyclestage) properties.lifecyclestage = input.lifecyclestage;

        if (input.additionalProperties) {
          Object.assign(properties, input.additionalProperties);
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/companies', 'POST', {
          properties
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_company',
      {
        title: 'Update Company',
        description: 'Update an existing company',
        inputSchema: {
          companyId: z.string().describe('Company ID'),
          properties: z.record(z.string()).describe('Properties to update (key-value pairs)')
        }
      },
      async ({ companyId, properties }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/companies/${companyId}`,
          'PATCH',
          { properties }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_company',
      {
        title: 'Delete Company',
        description: 'Delete a company',
        inputSchema: {
          companyId: z.string().describe('Company ID to delete')
        }
      },
      async ({ companyId }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/companies/${companyId}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: companyId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== DEAL TOOLS ====================

    server.registerTool(
      'list_deals',
      {
        title: 'List Deals',
        description: 'List deals from HubSpot CRM',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .describe('Number of deals to return (default: 100, max: 100)'),
          properties: z.array(z.string()).optional().describe('Specific properties to return'),
          archived: z.boolean().optional().describe('Include archived deals (default: false)')
        }
      },
      async ({ limit = 100, properties, archived = false }) => {
        let endpoint = `/crm/v3/objects/deals?limit=${limit}&archived=${archived}`;
        if (properties && properties.length > 0) {
          endpoint += `&properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_deals',
      {
        title: 'Search Deals',
        description: 'Search deals using filters',
        inputSchema: {
          filterGroups: z
            .array(
              z.object({
                filters: z.array(
                  z.object({
                    propertyName: z.string(),
                    operator: z.string(),
                    value: z.string()
                  })
                )
              })
            )
            .describe('Filter groups'),
          properties: z.array(z.string()).optional().describe('Properties to return'),
          limit: z.number().optional().describe('Number of results (default: 100)'),
          sorts: z
            .array(
              z.object({
                propertyName: z.string(),
                direction: z.enum(['ASCENDING', 'DESCENDING'])
              })
            )
            .optional()
            .describe('Sort order')
        }
      },
      async ({ filterGroups, properties, limit = 100, sorts }) => {
        const searchBody: any = {
          filterGroups,
          limit
        };

        if (properties && properties.length > 0) {
          searchBody.properties = properties;
        }

        if (sorts && sorts.length > 0) {
          searchBody.sorts = sorts;
        }

        const result = await makeHubSpotRequest(
          '/crm/v3/objects/deals/search',
          'POST',
          searchBody
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_deal',
      {
        title: 'Get Deal',
        description: 'Get a specific deal by ID',
        inputSchema: {
          dealId: z.string().describe('Deal ID'),
          properties: z.array(z.string()).optional().describe('Specific properties to return'),
          associations: z
            .array(z.string())
            .optional()
            .describe('Associated objects to include (e.g., ["contacts", "companies"])')
        }
      },
      async ({ dealId, properties, associations }) => {
        let endpoint = `/crm/v3/objects/deals/${dealId}`;
        const params: string[] = [];

        if (properties && properties.length > 0) {
          params.push(`properties=${properties.join(',')}`);
        }
        if (associations && associations.length > 0) {
          params.push(`associations=${associations.join(',')}`);
        }

        if (params.length > 0) {
          endpoint += `?${params.join('&')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_deal',
      {
        title: 'Create Deal',
        description: 'Create a new deal in HubSpot',
        inputSchema: {
          dealname: z.string().describe('Deal name (required)'),
          dealstage: z.string().describe('Deal stage (required)'),
          pipeline: z.string().optional().describe('Pipeline ID'),
          amount: z.string().optional().describe('Deal amount'),
          closedate: z
            .string()
            .optional()
            .describe('Close date (timestamp in milliseconds or ISO format)'),
          hubspot_owner_id: z.string().optional().describe('Owner user ID'),
          additionalProperties: z
            .record(z.string())
            .optional()
            .describe('Additional custom properties')
        }
      },
      async input => {
        const properties: any = {
          dealname: input.dealname,
          dealstage: input.dealstage
        };

        if (input.pipeline) properties.pipeline = input.pipeline;
        if (input.amount) properties.amount = input.amount;
        if (input.closedate) properties.closedate = input.closedate;
        if (input.hubspot_owner_id) properties.hubspot_owner_id = input.hubspot_owner_id;

        if (input.additionalProperties) {
          Object.assign(properties, input.additionalProperties);
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/deals', 'POST', {
          properties
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_deal',
      {
        title: 'Update Deal',
        description: 'Update an existing deal',
        inputSchema: {
          dealId: z.string().describe('Deal ID'),
          properties: z.record(z.string()).describe('Properties to update (key-value pairs)')
        }
      },
      async ({ dealId, properties }) => {
        const result = await makeHubSpotRequest(`/crm/v3/objects/deals/${dealId}`, 'PATCH', {
          properties
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_deal',
      {
        title: 'Delete Deal',
        description: 'Delete a deal',
        inputSchema: {
          dealId: z.string().describe('Deal ID to delete')
        }
      },
      async ({ dealId }) => {
        const result = await makeHubSpotRequest(`/crm/v3/objects/deals/${dealId}`, 'DELETE');
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, deleted: dealId }, null, 2) }
          ]
        };
      }
    );

    // ==================== TICKET TOOLS ====================

    server.registerTool(
      'list_tickets',
      {
        title: 'List Tickets',
        description: 'List support tickets from HubSpot',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .describe('Number of tickets to return (default: 100, max: 100)'),
          properties: z.array(z.string()).optional().describe('Specific properties to return')
        }
      },
      async ({ limit = 100, properties }) => {
        let endpoint = `/crm/v3/objects/tickets?limit=${limit}`;
        if (properties && properties.length > 0) {
          endpoint += `&properties=${properties.join(',')}`;
        }

        const result = await makeHubSpotRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_ticket',
      {
        title: 'Get Ticket',
        description: 'Get a specific ticket by ID',
        inputSchema: {
          ticketId: z.string().describe('Ticket ID')
        }
      },
      async ({ ticketId }) => {
        const result = await makeHubSpotRequest(`/crm/v3/objects/tickets/${ticketId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_ticket',
      {
        title: 'Create Ticket',
        description: 'Create a new support ticket',
        inputSchema: {
          subject: z.string().describe('Ticket subject (required)'),
          content: z.string().optional().describe('Ticket description/content'),
          hs_pipeline: z.string().optional().describe('Pipeline ID'),
          hs_pipeline_stage: z.string().optional().describe('Pipeline stage ID'),
          hs_ticket_priority: z.string().optional().describe('Priority (LOW, MEDIUM, HIGH)'),
          hubspot_owner_id: z.string().optional().describe('Owner user ID'),
          additionalProperties: z
            .record(z.string())
            .optional()
            .describe('Additional custom properties')
        }
      },
      async input => {
        const properties: any = {
          subject: input.subject
        };

        if (input.content) properties.content = input.content;
        if (input.hs_pipeline) properties.hs_pipeline = input.hs_pipeline;
        if (input.hs_pipeline_stage) properties.hs_pipeline_stage = input.hs_pipeline_stage;
        if (input.hs_ticket_priority) properties.hs_ticket_priority = input.hs_ticket_priority;
        if (input.hubspot_owner_id) properties.hubspot_owner_id = input.hubspot_owner_id;

        if (input.additionalProperties) {
          Object.assign(properties, input.additionalProperties);
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/tickets', 'POST', {
          properties
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_ticket',
      {
        title: 'Update Ticket',
        description: 'Update an existing ticket',
        inputSchema: {
          ticketId: z.string().describe('Ticket ID'),
          properties: z.record(z.string()).describe('Properties to update (key-value pairs)')
        }
      },
      async ({ ticketId, properties }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/tickets/${ticketId}`,
          'PATCH',
          { properties }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ASSOCIATION TOOLS ====================

    server.registerTool(
      'create_association',
      {
        title: 'Create Association',
        description: 'Associate two CRM objects (e.g., contact to company, deal to contact)',
        inputSchema: {
          fromObjectType: z
            .string()
            .describe('Source object type (contacts, companies, deals, tickets)'),
          fromObjectId: z.string().describe('Source object ID'),
          toObjectType: z.string().describe('Target object type'),
          toObjectId: z.string().describe('Target object ID'),
          associationType: z
            .string()
            .describe('Association type ID (e.g., "1" for contact_to_company)')
        }
      },
      async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, associationType }) => {
        const result: any = await makeHubSpotRequest(
          `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`,
          'PUT'
        );
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }
          ]
        };
      }
    );

    server.registerTool(
      'get_associations',
      {
        title: 'Get Associations',
        description: 'Get all associations for a CRM object',
        inputSchema: {
          objectType: z.string().describe('Object type (contacts, companies, deals, tickets)'),
          objectId: z.string().describe('Object ID'),
          toObjectType: z.string().describe('Associated object type to retrieve')
        }
      },
      async ({ objectType, objectId, toObjectType }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/${objectType}/${objectId}/associations/${toObjectType}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'remove_association',
      {
        title: 'Remove Association',
        description: 'Remove an association between two CRM objects',
        inputSchema: {
          fromObjectType: z.string().describe('Source object type'),
          fromObjectId: z.string().describe('Source object ID'),
          toObjectType: z.string().describe('Target object type'),
          toObjectId: z.string().describe('Target object ID'),
          associationType: z.string().describe('Association type ID')
        }
      },
      async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, associationType }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`,
          'DELETE'
        );
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, removed: true }, null, 2) }
          ]
        };
      }
    );

    // ==================== PIPELINE TOOLS ====================

    server.registerTool(
      'get_pipelines',
      {
        title: 'Get Pipelines',
        description: 'Get all pipelines for an object type',
        inputSchema: {
          objectType: z.enum(['deals', 'tickets']).describe('Object type (deals or tickets)')
        }
      },
      async ({ objectType }) => {
        const result = await makeHubSpotRequest(`/crm/v3/pipelines/${objectType}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_pipeline_stages',
      {
        title: 'Get Pipeline Stages',
        description: 'Get stages for a specific pipeline',
        inputSchema: {
          objectType: z.enum(['deals', 'tickets']).describe('Object type'),
          pipelineId: z.string().describe('Pipeline ID')
        }
      },
      async ({ objectType, pipelineId }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/pipelines/${objectType}/${pipelineId}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== OWNER TOOLS ====================

    server.registerTool(
      'list_owners',
      {
        title: 'List Owners',
        description: 'List all CRM owners (users who can be assigned records)',
        inputSchema: {
          limit: z.number().optional().describe('Number of owners to return (default: 100)')
        }
      },
      async ({ limit = 100 }) => {
        const result = await makeHubSpotRequest(`/crm/v3/owners?limit=${limit}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_owner',
      {
        title: 'Get Owner',
        description: 'Get a specific owner by ID',
        inputSchema: {
          ownerId: z.string().describe('Owner ID')
        }
      },
      async ({ ownerId }) => {
        const result = await makeHubSpotRequest(`/crm/v3/owners/${ownerId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ENGAGEMENT TOOLS ====================

    server.registerTool(
      'create_note',
      {
        title: 'Create Note',
        description: 'Create a note engagement on a CRM record',
        inputSchema: {
          note: z.string().describe('Note content'),
          timestamp: z
            .string()
            .optional()
            .describe('Note timestamp (ISO format or milliseconds)'),
          ownerId: z.string().optional().describe('Owner user ID'),
          associations: z
            .array(
              z.object({
                toObjectType: z.string(),
                toObjectId: z.string()
              })
            )
            .optional()
            .describe('Associated objects')
        }
      },
      async input => {
        const body: any = {
          properties: {
            hs_note_body: input.note
          }
        };

        if (input.timestamp) body.properties.hs_timestamp = input.timestamp;
        if (input.ownerId) body.properties.hubspot_owner_id = input.ownerId;

        if (input.associations && input.associations.length > 0) {
          body.associations = input.associations.map(assoc => ({
            to: { id: assoc.toObjectId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 202 // Note to object
              }
            ]
          }));
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/notes', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_task',
      {
        title: 'Create Task',
        description: 'Create a task engagement',
        inputSchema: {
          subject: z.string().describe('Task subject'),
          body: z.string().optional().describe('Task description'),
          status: z
            .enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'WAITING', 'DEFERRED'])
            .optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
          dueDate: z.string().optional().describe('Due date (ISO format or milliseconds)'),
          ownerId: z.string().optional().describe('Owner user ID'),
          associations: z
            .array(
              z.object({
                toObjectType: z.string(),
                toObjectId: z.string()
              })
            )
            .optional()
            .describe('Associated objects')
        }
      },
      async input => {
        const properties: any = {
          hs_task_subject: input.subject
        };

        if (input.body) properties.hs_task_body = input.body;
        if (input.status) properties.hs_task_status = input.status;
        if (input.priority) properties.hs_task_priority = input.priority;
        if (input.dueDate) properties.hs_timestamp = input.dueDate;
        if (input.ownerId) properties.hubspot_owner_id = input.ownerId;

        const body: any = { properties };

        if (input.associations && input.associations.length > 0) {
          body.associations = input.associations.map(assoc => ({
            to: { id: assoc.toObjectId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 204 // Task to object
              }
            ]
          }));
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/tasks', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_meeting',
      {
        title: 'Create Meeting',
        description: 'Create a meeting engagement',
        inputSchema: {
          title: z.string().describe('Meeting title'),
          body: z.string().optional().describe('Meeting description'),
          startTime: z.string().describe('Meeting start time (ISO format or milliseconds)'),
          endTime: z.string().describe('Meeting end time (ISO format or milliseconds)'),
          ownerId: z.string().optional().describe('Owner user ID'),
          associations: z
            .array(
              z.object({
                toObjectType: z.string(),
                toObjectId: z.string()
              })
            )
            .optional()
            .describe('Associated objects')
        }
      },
      async input => {
        const properties: any = {
          hs_meeting_title: input.title,
          hs_meeting_start_time: input.startTime,
          hs_meeting_end_time: input.endTime
        };

        if (input.body) properties.hs_meeting_body = input.body;
        if (input.ownerId) properties.hubspot_owner_id = input.ownerId;

        const body: any = { properties };

        if (input.associations && input.associations.length > 0) {
          body.associations = input.associations.map(assoc => ({
            to: { id: assoc.toObjectId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 200 // Meeting to object
              }
            ]
          }));
        }

        const result = await makeHubSpotRequest('/crm/v3/objects/meetings', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== LIST TOOLS ====================

    server.registerTool(
      'get_lists',
      {
        title: 'Get Lists',
        description: 'Get all contact lists',
        inputSchema: {
          limit: z.number().optional().describe('Number of lists to return (default: 100)')
        }
      },
      async ({ limit = 100 }) => {
        const result = await makeHubSpotRequest(`/crm/v3/lists?limit=${limit}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_list_memberships',
      {
        title: 'Get List Memberships',
        description: 'Get contacts in a specific list',
        inputSchema: {
          listId: z.string().describe('List ID'),
          limit: z.number().optional().describe('Number of members to return (default: 100)')
        }
      },
      async ({ listId, limit = 100 }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/lists/${listId}/memberships?limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_to_list',
      {
        title: 'Add to List',
        description: 'Add contacts to a static list',
        inputSchema: {
          listId: z.string().describe('List ID'),
          contactIds: z.array(z.string()).describe('Array of contact IDs to add')
        }
      },
      async ({ listId, contactIds }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/lists/${listId}/memberships/add`,
          'POST',
          contactIds
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'remove_from_list',
      {
        title: 'Remove from List',
        description: 'Remove contacts from a static list',
        inputSchema: {
          listId: z.string().describe('List ID'),
          contactIds: z.array(z.string()).describe('Array of contact IDs to remove')
        }
      },
      async ({ listId, contactIds }) => {
        const result = await makeHubSpotRequest(
          `/crm/v3/lists/${listId}/memberships/remove`,
          'POST',
          contactIds
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== PROPERTIES TOOLS ====================

    server.registerTool(
      'get_properties',
      {
        title: 'Get Properties',
        description: 'Get all properties for an object type',
        inputSchema: {
          objectType: z
            .enum(['contacts', 'companies', 'deals', 'tickets'])
            .describe('Object type')
        }
      },
      async ({ objectType }) => {
        const result = await makeHubSpotRequest(`/crm/v3/properties/${objectType}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_property',
      {
        title: 'Create Property',
        description: 'Create a custom property for an object type',
        inputSchema: {
          objectType: z
            .enum(['contacts', 'companies', 'deals', 'tickets'])
            .describe('Object type'),
          name: z.string().describe('Property name (internal name)'),
          label: z.string().describe('Property label (display name)'),
          type: z
            .enum(['string', 'number', 'date', 'datetime', 'enumeration', 'bool'])
            .describe('Property type'),
          fieldType: z
            .string()
            .describe('Field type (text, textarea, select, radio, checkbox, etc.)'),
          groupName: z.string().optional().describe('Property group name'),
          description: z.string().optional().describe('Property description'),
          options: z
            .array(
              z.object({
                label: z.string(),
                value: z.string()
              })
            )
            .optional()
            .describe('Options for enumeration type')
        }
      },
      async input => {
        const property: any = {
          name: input.name,
          label: input.label,
          type: input.type,
          fieldType: input.fieldType
        };

        if (input.groupName) property.groupName = input.groupName;
        if (input.description) property.description = input.description;
        if (input.options) property.options = input.options;

        const result = await makeHubSpotRequest(
          `/crm/v3/properties/${input.objectType}`,
          'POST',
          property
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ANALYTICS TOOLS ====================

    server.registerTool(
      'get_analytics_views',
      {
        title: 'Get Analytics Views',
        description: 'Get page view analytics data',
        inputSchema: {
          startDate: z.string().describe('Start date (YYYY-MM-DD)'),
          endDate: z.string().describe('End date (YYYY-MM-DD)')
        }
      },
      async ({ startDate, endDate }) => {
        const result = await makeHubSpotRequest(
          `/analytics/v2/reports/totals/total-views?start=${startDate}&end=${endDate}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
