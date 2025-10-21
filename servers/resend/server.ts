import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

// Configuration interface
interface Config {
  token: string;
}

// Initialize server
metorial.createServer<Config>(
  {
    name: 'resend-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Base URL for Resend API
    const RESEND_API_BASE = 'https://api.resend.com';

    // Helper function to make API requests
    async function resendRequest(
      endpoint: string,
      method: string = 'GET',
      body?: any
    ): Promise<any> {
      const url = `${RESEND_API_BASE}${endpoint}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
      }

      return response.json();
    }

    // ============================================================================
    // TOOLS - Email Operations
    // ============================================================================

    server.registerTool(
      'send_email',
      {
        title: 'Send Email',
        description: 'Send a single email via Resend',
        inputSchema: {
          from: z.string().describe('Sender email address (must be from verified domain)'),
          to: z
            .union([z.string(), z.array(z.string())])
            .describe('Recipient email address(es)'),
          subject: z.string().describe('Email subject line'),
          html: z.string().optional().describe('HTML content of the email'),
          text: z.string().optional().describe('Plain text content of the email'),
          cc: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .describe('CC recipients'),
          bcc: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .describe('BCC recipients'),
          reply_to: z
            .union([z.string(), z.array(z.string())])
            .optional()
            .describe('Reply-to address(es)'),
          tags: z
            .array(
              z.object({
                name: z.string(),
                value: z.string()
              })
            )
            .optional()
            .describe('Email tags for categorization'),
          headers: z.record(z.string()).optional().describe('Custom email headers'),
          attachments: z
            .array(
              z.object({
                filename: z.string(),
                content: z.string().describe('Base64 encoded file content'),
                content_type: z.string().optional()
              })
            )
            .optional()
            .describe('File attachments')
        }
      },
      async args => {
        const result = await resendRequest('/emails', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully!\nEmail ID: ${
                result.id
              }\n\nDetails:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'send_batch_emails',
      {
        title: 'Send Batch Emails',
        description: 'Send multiple emails in a single request (up to 100)',
        inputSchema: {
          emails: z
            .array(
              z.object({
                from: z.string(),
                to: z.union([z.string(), z.array(z.string())]),
                subject: z.string(),
                html: z.string().optional(),
                text: z.string().optional(),
                cc: z.union([z.string(), z.array(z.string())]).optional(),
                bcc: z.union([z.string(), z.array(z.string())]).optional(),
                reply_to: z.union([z.string(), z.array(z.string())]).optional(),
                tags: z
                  .array(
                    z.object({
                      name: z.string(),
                      value: z.string()
                    })
                  )
                  .optional(),
                headers: z.record(z.string()).optional()
              })
            )
            .max(100)
            .describe('Array of email objects to send')
        }
      },
      async ({ emails }) => {
        const result = await resendRequest('/emails/batch', 'POST', emails);
        return {
          content: [
            {
              type: 'text',
              text: `Batch emails sent!\n\nResults:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_emails',
      {
        title: 'List Emails',
        description: 'List sent emails with optional filtering',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe('Number of results to return (max 100)'),
          offset: z.number().min(0).optional().describe('Number of results to skip'),
          from: z.string().optional().describe('Filter by sender email'),
          to: z.string().optional().describe('Filter by recipient email'),
          subject: z.string().optional().describe('Filter by subject line')
        }
      },
      async args => {
        const params = new URLSearchParams();
        if (args.limit) params.append('limit', String(args.limit));
        if (args.offset) params.append('offset', String(args.offset));
        if (args.from) params.append('from', args.from);
        if (args.to) params.append('to', args.to);
        if (args.subject) params.append('subject', args.subject);

        const queryString = params.toString();
        const endpoint = `/emails${queryString ? `?${queryString}` : ''}`;
        const result = await resendRequest(endpoint);

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.data?.length || 0} emails:\n\n${JSON.stringify(
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
    // TOOLS - Domain Management
    // ============================================================================

    server.registerTool(
      'add_domain',
      {
        title: 'Add Domain',
        description: 'Add a new domain for sending emails',
        inputSchema: {
          name: z.string().describe('Domain name (e.g., example.com)'),
          region: z
            .enum(['us-east-1', 'eu-west-1', 'sa-east-1'])
            .optional()
            .describe('AWS region for the domain')
        }
      },
      async args => {
        const result = await resendRequest('/domains', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Domain added successfully!\nDomain ID: ${
                result.id
              }\n\nDNS Records to configure:\n${JSON.stringify(result.records, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_domains',
      {
        title: 'List Domains',
        description: 'List all domains configured in your account',
        inputSchema: {}
      },
      async () => {
        const result = await resendRequest('/domains');
        return {
          content: [
            {
              type: 'text',
              text: `Domains:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'verify_domain',
      {
        title: 'Verify Domain',
        description: 'Verify a domain after DNS records are configured',
        inputSchema: {
          domain_id: z.string().describe('ID of the domain to verify')
        }
      },
      async ({ domain_id }) => {
        const result = await resendRequest(`/domains/${domain_id}/verify`, 'POST');
        return {
          content: [
            {
              type: 'text',
              text: `Domain verification result:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_domain',
      {
        title: 'Update Domain',
        description: 'Update domain tracking settings',
        inputSchema: {
          domain_id: z.string().describe('ID of the domain to update'),
          open_tracking: z.boolean().optional().describe('Enable/disable open tracking'),
          click_tracking: z.boolean().optional().describe('Enable/disable click tracking')
        }
      },
      async ({ domain_id, ...settings }) => {
        const result = await resendRequest(`/domains/${domain_id}`, 'PATCH', settings);
        return {
          content: [
            {
              type: 'text',
              text: `Domain updated successfully:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_domain',
      {
        title: 'Delete Domain',
        description: 'Delete a domain from your account',
        inputSchema: {
          domain_id: z.string().describe('ID of the domain to delete')
        }
      },
      async ({ domain_id }) => {
        await resendRequest(`/domains/${domain_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `Domain ${domain_id} deleted successfully`
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - API Key Management
    // ============================================================================

    server.registerTool(
      'create_api_key',
      {
        title: 'Create API Key',
        description: 'Create a new API key with specified permissions',
        inputSchema: {
          name: z.string().describe('Name for the API key'),
          permission: z
            .enum(['full_access', 'sending_access'])
            .optional()
            .describe('Permission level for the key'),
          domain_id: z.string().optional().describe('Restrict key to a specific domain')
        }
      },
      async args => {
        const result = await resendRequest('/api-keys', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `API key created successfully!\n\nIMPORTANT: Save this key securely, it won't be shown again:\n${result.token}\n\nKey ID: ${result.id}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_api_keys',
      {
        title: 'List API Keys',
        description: 'List all API keys in your account',
        inputSchema: {}
      },
      async () => {
        const result = await resendRequest('/api-keys');
        return {
          content: [
            {
              type: 'text',
              text: `API Keys:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_api_key',
      {
        title: 'Delete API Key',
        description: 'Delete an API key',
        inputSchema: {
          api_key_id: z.string().describe('ID of the API key to delete')
        }
      },
      async ({ api_key_id }) => {
        await resendRequest(`/api-keys/${api_key_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `API key ${api_key_id} deleted successfully`
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - Audience Management
    // ============================================================================

    server.registerTool(
      'create_audience',
      {
        title: 'Create Audience',
        description: 'Create a new audience (contact list) for broadcast emails',
        inputSchema: {
          name: z.string().describe('Name for the audience')
        }
      },
      async args => {
        const result = await resendRequest('/audiences', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Audience created successfully!\nAudience ID: ${
                result.id
              }\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_audiences',
      {
        title: 'List Audiences',
        description: 'List all audiences in your account',
        inputSchema: {}
      },
      async () => {
        const result = await resendRequest('/audiences');
        return {
          content: [
            {
              type: 'text',
              text: `Audiences:\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_audience',
      {
        title: 'Delete Audience',
        description: 'Delete an audience and all its contacts',
        inputSchema: {
          audience_id: z.string().describe('ID of the audience to delete')
        }
      },
      async ({ audience_id }) => {
        await resendRequest(`/audiences/${audience_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `Audience ${audience_id} deleted successfully`
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - Contact Management
    // ============================================================================

    server.registerTool(
      'add_contact',
      {
        title: 'Add Contact',
        description: 'Add a contact to an audience',
        inputSchema: {
          audience_id: z.string().describe('ID of the audience'),
          email: z.string().email().describe('Contact email address'),
          first_name: z.string().optional().describe('Contact first name'),
          last_name: z.string().optional().describe('Contact last name'),
          unsubscribed: z.boolean().optional().describe('Whether contact is unsubscribed')
        }
      },
      async ({ audience_id, ...contactData }) => {
        const result = await resendRequest(
          `/audiences/${audience_id}/contacts`,
          'POST',
          contactData
        );
        return {
          content: [
            {
              type: 'text',
              text: `Contact added successfully!\nContact ID: ${result.id}\n\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_contacts',
      {
        title: 'List Contacts',
        description: 'List all contacts in an audience',
        inputSchema: {
          audience_id: z.string().describe('ID of the audience')
        }
      },
      async ({ audience_id }) => {
        const result = await resendRequest(`/audiences/${audience_id}/contacts`);
        return {
          content: [
            {
              type: 'text',
              text: `Contacts in audience ${audience_id}:\n\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'remove_contact',
      {
        title: 'Remove Contact',
        description: 'Remove a contact from an audience',
        inputSchema: {
          audience_id: z.string().describe('ID of the audience'),
          contact_id: z.string().describe('ID of the contact to remove')
        }
      },
      async ({ audience_id, contact_id }) => {
        await resendRequest(`/audiences/${audience_id}/contacts/${contact_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `Contact ${contact_id} removed from audience ${audience_id}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - Broadcasting
    // ============================================================================

    server.registerTool(
      'create_broadcast',
      {
        title: 'Create Broadcast',
        description: 'Send a broadcast email to all contacts in an audience',
        inputSchema: {
          audience_id: z.string().describe('ID of the target audience'),
          from: z.string().describe('Sender email address'),
          subject: z.string().describe('Email subject line'),
          html: z.string().optional().describe('HTML content of the email'),
          text: z.string().optional().describe('Plain text content of the email'),
          reply_to: z.string().optional().describe('Reply-to address')
        }
      },
      async ({ audience_id, ...emailData }) => {
        const result = await resendRequest(
          `/audiences/${audience_id}/broadcasts`,
          'POST',
          emailData
        );
        return {
          content: [
            {
              type: 'text',
              text: `Broadcast created successfully!\nBroadcast ID: ${
                result.id
              }\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    server.registerResource(
      'email',
      new ResourceTemplate('resend://email/{email_id}', { list: undefined }),
      {
        title: 'Email Resource',
        description: 'Get details of a specific sent email'
      },
      async (uri, { email_id }) => {
        const result = await resendRequest(`/emails/${email_id}`);
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
      'domain',
      new ResourceTemplate('resend://domain/{domain_id}', { list: undefined }),
      {
        title: 'Domain Resource',
        description: 'Get details of a specific domain'
      },
      async (uri, { domain_id }) => {
        const result = await resendRequest(`/domains/${domain_id}`);
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
      'audience',
      new ResourceTemplate('resend://audience/{audience_id}', { list: undefined }),
      {
        title: 'Audience Resource',
        description: 'Get details of a specific audience'
      },
      async (uri, { audience_id }) => {
        const result = await resendRequest(`/audiences/${audience_id}`);
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
      'contact',
      new ResourceTemplate('resend://contact/{audience_id}/{contact_id}', { list: undefined }),
      {
        title: 'Contact Resource',
        description: 'Get details of a specific contact in an audience'
      },
      async (uri, { audience_id, contact_id }) => {
        const result = await resendRequest(`/audiences/${audience_id}/contacts/${contact_id}`);
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
      'api-key',
      new ResourceTemplate('resend://api-key/{api_key_id}', { list: undefined }),
      {
        title: 'API Key Resource',
        description: 'Get details of a specific API key'
      },
      async (uri, { api_key_id }) => {
        const result = await resendRequest(`/api-keys/${api_key_id}`);
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
