import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * WhatsApp MCP Server
 * Provides tools and resources for interacting with the WhatsApp Business API
 */

interface Config {
  token: string;
  phoneNumberId: string;
}

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

metorial.createServer<Config>(
  {
    name: 'whatsapp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    /**
     * Helper function to make WhatsApp API requests
     */
    async function makeWhatsAppRequest(
      endpoint: string,
      method: string = 'GET',
      body?: any
    ): Promise<any> {
      const url = `${WHATSAPP_API_BASE}${endpoint}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
      }

      return data;
    }

    // ==================== TOOLS ====================

    /**
     * Tool: Send a text message
     */
    server.registerTool(
      'send_text_message',
      {
        title: 'Send Text Message',
        description: 'Send a text message to a WhatsApp number',
        inputSchema: {
          recipient: z
            .string()
            .describe('Recipient phone number in international format (e.g., +1234567890)'),
          text: z.string().describe('The text message to send'),
          preview_url: z
            .boolean()
            .optional()
            .describe('Whether to show URL preview in the message')
        }
      },
      async ({ recipient, text, preview_url }) => {
        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: {
            preview_url: preview_url ?? false,
            body: text
          }
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send a template message
     */
    server.registerTool(
      'send_template_message',
      {
        title: 'Send Template Message',
        description: 'Send a pre-approved message template',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          template_name: z.string().describe('Name of the approved template'),
          language_code: z.string().describe('Language code (e.g., en, en_US)'),
          parameters: z
            .array(z.string())
            .optional()
            .describe('Array of parameter values for the template')
        }
      },
      async ({ recipient, template_name, language_code, parameters }) => {
        const components: any[] = [];

        if (parameters && parameters.length > 0) {
          components.push({
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          });
        }

        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'template',
          template: {
            name: template_name,
            language: {
              code: language_code
            },
            components: components.length > 0 ? components : undefined
          }
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send media message
     */
    server.registerTool(
      'send_media_message',
      {
        title: 'Send Media Message',
        description: 'Send an image, video, audio, or document message',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          media_type: z
            .enum(['image', 'video', 'audio', 'document'])
            .describe('Type of media to send'),
          media_url: z.string().optional().describe('URL of the media file'),
          media_id: z
            .string()
            .optional()
            .describe('Media ID from WhatsApp (alternative to URL)'),
          caption: z
            .string()
            .optional()
            .describe('Caption for the media (for image, video, document)'),
          filename: z.string().optional().describe('Filename for document type')
        }
      },
      async ({ recipient, media_type, media_url, media_id, caption, filename }) => {
        if (!media_url && !media_id) {
          throw new Error('Either media_url or media_id must be provided');
        }

        const mediaObject: any = media_id ? { id: media_id } : { link: media_url };

        if (caption && ['image', 'video', 'document'].includes(media_type)) {
          mediaObject.caption = caption;
        }

        if (filename && media_type === 'document') {
          mediaObject.filename = filename;
        }

        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: media_type,
          [media_type]: mediaObject
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send location message
     */
    server.registerTool(
      'send_location_message',
      {
        title: 'Send Location Message',
        description: 'Send a location message with coordinates',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          latitude: z.number().describe('Latitude coordinate'),
          longitude: z.number().describe('Longitude coordinate'),
          name: z.string().optional().describe('Name of the location'),
          address: z.string().optional().describe('Address of the location')
        }
      },
      async ({ recipient, latitude, longitude, name, address }) => {
        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'location',
          location: {
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            name,
            address
          }
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send contact message
     */
    server.registerTool(
      'send_contact_message',
      {
        title: 'Send Contact Message',
        description: 'Send one or more contact cards',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          contacts: z
            .array(
              z.object({
                name: z.object({
                  formatted_name: z.string().describe('Full name of the contact'),
                  first_name: z.string().optional(),
                  last_name: z.string().optional()
                }),
                phones: z
                  .array(
                    z.object({
                      phone: z.string().describe('Phone number'),
                      type: z.string().optional().describe('Type of phone (e.g., CELL, WORK)')
                    })
                  )
                  .optional(),
                emails: z
                  .array(
                    z.object({
                      email: z.string(),
                      type: z.string().optional()
                    })
                  )
                  .optional()
              })
            )
            .describe('Array of contact objects to send')
        }
      },
      async ({ recipient, contacts }) => {
        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'contacts',
          contacts
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send interactive message with buttons
     */
    server.registerTool(
      'send_interactive_buttons',
      {
        title: 'Send Interactive Buttons Message',
        description: 'Send an interactive message with up to 3 buttons',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          body_text: z.string().describe('Body text of the message'),
          header_text: z.string().optional().describe('Optional header text'),
          footer_text: z.string().optional().describe('Optional footer text'),
          buttons: z
            .array(
              z.object({
                id: z.string().describe('Unique button ID'),
                title: z.string().describe('Button text (max 20 characters)')
              })
            )
            .min(1)
            .max(3)
            .describe('Array of 1-3 buttons')
        }
      },
      async ({ recipient, body_text, header_text, footer_text, buttons }) => {
        const interactive: any = {
          type: 'button',
          body: {
            text: body_text
          },
          action: {
            buttons: buttons.map(btn => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title
              }
            }))
          }
        };

        if (header_text) {
          interactive.header = {
            type: 'text',
            text: header_text
          };
        }

        if (footer_text) {
          interactive.footer = {
            text: footer_text
          };
        }

        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'interactive',
          interactive
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Send interactive list message
     */
    server.registerTool(
      'send_interactive_list',
      {
        title: 'Send Interactive List Message',
        description: 'Send an interactive message with a list of options',
        inputSchema: {
          recipient: z.string().describe('Recipient phone number in international format'),
          body_text: z.string().describe('Body text of the message'),
          button_text: z.string().describe('Text on the list button (max 20 characters)'),
          header_text: z.string().optional().describe('Optional header text'),
          footer_text: z.string().optional().describe('Optional footer text'),
          sections: z
            .array(
              z.object({
                title: z.string().optional().describe('Section title'),
                rows: z.array(
                  z.object({
                    id: z.string().describe('Unique row ID'),
                    title: z.string().describe('Row title (max 24 characters)'),
                    description: z
                      .string()
                      .optional()
                      .describe('Row description (max 72 characters)')
                  })
                )
              })
            )
            .describe('Sections with rows')
        }
      },
      async ({ recipient, body_text, button_text, header_text, footer_text, sections }) => {
        const interactive: any = {
          type: 'list',
          body: {
            text: body_text
          },
          action: {
            button: button_text,
            sections
          }
        };

        if (header_text) {
          interactive.header = {
            type: 'text',
            text: header_text
          };
        }

        if (footer_text) {
          interactive.footer = {
            text: footer_text
          };
        }

        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'interactive',
          interactive
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: Mark message as read
     */
    server.registerTool(
      'mark_message_as_read',
      {
        title: 'Mark Message as Read',
        description: 'Mark a received message as read',
        inputSchema: {
          message_id: z.string().describe('The message ID to mark as read')
        }
      },
      async ({ message_id }) => {
        const body = {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id
        };

        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/messages`,
          'POST',
          body
        );

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

    /**
     * Tool: List message templates
     */
    server.registerTool(
      'list_message_templates',
      {
        title: 'List Message Templates',
        description: 'List all approved message templates for the WhatsApp Business Account',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .describe('Number of templates to return (default: 100)'),
          after: z.string().optional().describe('Cursor for pagination')
        }
      },
      async ({ limit, after }) => {
        let endpoint = `/${config.phoneNumberId}/message_templates?limit=${limit ?? 100}`;
        if (after) {
          endpoint += `&after=${after}`;
        }

        const result = await makeWhatsAppRequest(endpoint);

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

    /**
     * Tool: Upload media
     */
    server.registerTool(
      'upload_media',
      {
        title: 'Upload Media',
        description: 'Upload media to WhatsApp servers and get a media ID',
        inputSchema: {
          media_url: z.string().describe('URL of the media file to upload'),
          media_type: z
            .string()
            .describe('MIME type of the media (e.g., image/jpeg, video/mp4)')
        }
      },
      async ({ media_url, media_type }) => {
        // First, fetch the media from the URL
        const mediaResponse = await fetch(media_url);
        if (!mediaResponse.ok) {
          throw new Error(`Failed to fetch media from URL: ${mediaResponse.statusText}`);
        }

        const mediaBlob = await mediaResponse.blob();
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', mediaBlob as any, 'media');
        formData.append('type', media_type);

        const response = await fetch(`${WHATSAPP_API_BASE}/${config.phoneNumberId}/media`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`
          },
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(`Upload failed: ${JSON.stringify(result)}`);
        }

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

    /**
     * Tool: Delete media
     */
    server.registerTool(
      'delete_media',
      {
        title: 'Delete Media',
        description: 'Delete media from WhatsApp servers',
        inputSchema: {
          media_id: z.string().describe('The media ID to delete')
        }
      },
      async ({ media_id }) => {
        const result = await makeWhatsAppRequest(`/${media_id}`, 'DELETE');

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

    // ==================== RESOURCES ====================

    /**
     * Resource: Get media details
     */
    server.registerResource(
      'media',
      new ResourceTemplate('whatsapp://media/{media_id}', { list: undefined }),
      {
        title: 'Media Resource',
        description: 'Get details and download URL for specific media'
      },
      async (uri, { media_id }) => {
        const result = await makeWhatsAppRequest(`/${media_id}`);

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

    /**
     * Resource: Get business profile
     */
    server.registerResource(
      'business_profile',
      new ResourceTemplate('whatsapp://profile/business', { list: undefined }),
      {
        title: 'Business Profile Resource',
        description: 'Get business profile information'
      },
      async uri => {
        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`
        );

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

    /**
     * Resource: Get phone number details
     */
    server.registerResource(
      'phone_profile',
      new ResourceTemplate('whatsapp://profile/phone/{phone_number_id}', { list: undefined }),
      {
        title: 'Phone Number Profile Resource',
        description: 'Get phone number profile and quality details'
      },
      async (uri, { phone_number_id }) => {
        const result = await makeWhatsAppRequest(
          `/${phone_number_id}?fields=verified_name,display_phone_number,quality_rating,messaging_limit_tier`
        );

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

    /**
     * Resource: Get template details
     */
    server.registerResource(
      'template',
      new ResourceTemplate('whatsapp://template/{template_name}', { list: undefined }),
      {
        title: 'Template Resource',
        description: 'Get details of a specific message template'
      },
      async (uri, { template_name }) => {
        // Templates are retrieved as part of a list, so we fetch and filter
        const result = await makeWhatsAppRequest(
          `/${config.phoneNumberId}/message_templates?name=${template_name}`
        );

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
