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
    fields: [
      {
        type: 'select',
        label: 'Account Type',
        key: 'accountType',
        isRequired: true,
        options: [
          { value: 'common', label: 'Work or School & Personal Accounts' },
          { value: 'organizations', label: 'Work or School Accounts Only' },
          { value: 'consumers', label: 'Personal Microsoft Accounts Only' }
        ]
      }
    ]
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const tenant = input.fields.accountType || 'common';

    const scopes = [
      'User.Read',
      'Mail.ReadWrite',
      'Mail.Send',
      'Calendars.ReadWrite',
      'Contacts.ReadWrite',
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All',
      'Tasks.ReadWrite',
      'Notes.ReadWrite.All',
      'People.Read',
      'offline_access'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: input.clientId,
      response_type: 'code',
      redirect_uri: input.redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: input.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`,
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

      const tenant = input.fields.accountType || 'common';

      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: code,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: tokenParams.toString()
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const tenant = input.fields?.accountType || 'common';

      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: 'refresh_token'
      });

      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: tokenParams.toString()
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || input.refreshToken,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope
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
    name: 'microsoft365-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Microsoft Graph API calls
    async function makeGraphRequest(endpoint: string, method: string = 'GET', body?: any) {
      const url = `https://graph.microsoft.com/v1.0${endpoint}`;

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
        throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ==================== USER/PROFILE TOOLS ====================

    server.registerTool(
      'get_my_profile',
      {
        title: 'Get My Profile',
        description: "Get the current user's profile information",
        inputSchema: {}
      },
      async () => {
        const result = await makeGraphRequest('/me');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_user',
      {
        title: 'Get User',
        description: "Get a specific user's profile information",
        inputSchema: {
          userIdOrPrincipalName: z.string().describe('User ID or user principal name (email)')
        }
      },
      async ({ userIdOrPrincipalName }) => {
        const result = await makeGraphRequest(`/users/${userIdOrPrincipalName}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_users',
      {
        title: 'Search Users',
        description: 'Search for users in the organization',
        inputSchema: {
          searchTerm: z.string().describe('Search term (name or email)'),
          top: z.number().optional().describe('Number of results to return (default: 25)')
        }
      },
      async ({ searchTerm, top = 25 }) => {
        const result = await makeGraphRequest(
          `/users?$search="displayName:${searchTerm}" OR "mail:${searchTerm}"&$top=${top}`,
          'GET'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== EMAIL TOOLS ====================

    server.registerTool(
      'list_messages',
      {
        title: 'List Email Messages',
        description: 'List email messages from mailbox',
        inputSchema: {
          folderId: z
            .string()
            .optional()
            .describe('Folder ID or well-known name (inbox, sentitems, drafts)'),
          filter: z
            .string()
            .optional()
            .describe(
              'OData filter (e.g., "from/emailAddress/address eq \'user@example.com\'"'
            ),
          search: z.string().optional().describe('Search query'),
          top: z.number().optional().describe('Number of messages to return (default: 25)'),
          orderBy: z
            .string()
            .optional()
            .describe('Order by field (default: receivedDateTime desc)')
        }
      },
      async ({
        folderId = 'inbox',
        filter,
        search,
        top = 25,
        orderBy = 'receivedDateTime desc'
      }) => {
        let endpoint = `/me/mailFolders/${folderId}/messages?$top=${top}&$orderby=${orderBy}`;
        if (filter) endpoint += `&$filter=${encodeURIComponent(filter)}`;
        if (search) endpoint += `&$search="${encodeURIComponent(search)}"`;

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_message',
      {
        title: 'Get Email Message',
        description: 'Get a specific email message',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGraphRequest(`/me/messages/${messageId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'send_email',
      {
        title: 'Send Email',
        description: 'Send an email message',
        inputSchema: {
          to: z.array(z.string()).describe('Recipient email addresses'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body (HTML or plain text)'),
          bodyType: z
            .enum(['Text', 'HTML'])
            .optional()
            .describe('Body content type (default: HTML)'),
          cc: z.array(z.string()).optional().describe('CC email addresses'),
          bcc: z.array(z.string()).optional().describe('BCC email addresses'),
          importance: z
            .enum(['Low', 'Normal', 'High'])
            .optional()
            .describe('Email importance'),
          saveToSentItems: z
            .boolean()
            .optional()
            .describe('Save to sent items (default: true)')
        }
      },
      async input => {
        const message: any = {
          subject: input.subject,
          body: {
            contentType: input.bodyType || 'HTML',
            content: input.body
          },
          toRecipients: input.to.map(email => ({
            emailAddress: { address: email }
          }))
        };

        if (input.cc) {
          message.ccRecipients = input.cc.map(email => ({
            emailAddress: { address: email }
          }));
        }

        if (input.bcc) {
          message.bccRecipients = input.bcc.map(email => ({
            emailAddress: { address: email }
          }));
        }

        if (input.importance) {
          message.importance = input.importance;
        }

        const result: any = await makeGraphRequest('/me/sendMail', 'POST', {
          message,
          saveToSentItems: input.saveToSentItems !== false
        });

        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }
          ]
        };
      }
    );

    server.registerTool(
      'create_draft',
      {
        title: 'Create Draft Email',
        description: 'Create a draft email message',
        inputSchema: {
          to: z.array(z.string()).optional().describe('Recipient email addresses'),
          subject: z.string().optional().describe('Email subject'),
          body: z.string().optional().describe('Email body'),
          bodyType: z
            .enum(['Text', 'HTML'])
            .optional()
            .describe('Body content type (default: HTML)')
        }
      },
      async input => {
        const message: any = {};

        if (input.subject) message.subject = input.subject;
        if (input.body) {
          message.body = {
            contentType: input.bodyType || 'HTML',
            content: input.body
          };
        }
        if (input.to) {
          message.toRecipients = input.to.map(email => ({
            emailAddress: { address: email }
          }));
        }

        const result = await makeGraphRequest('/me/messages', 'POST', message);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'reply_to_message',
      {
        title: 'Reply to Message',
        description: 'Reply to an email message',
        inputSchema: {
          messageId: z.string().describe('Message ID to reply to'),
          comment: z.string().describe('Reply message body')
        }
      },
      async ({ messageId, comment }) => {
        const result: any = await makeGraphRequest(`/me/messages/${messageId}/reply`, 'POST', {
          comment
        });
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }
          ]
        };
      }
    );

    server.registerTool(
      'delete_message',
      {
        title: 'Delete Message',
        description: 'Delete an email message',
        inputSchema: {
          messageId: z.string().describe('Message ID to delete')
        }
      },
      async ({ messageId }) => {
        const result = await makeGraphRequest(`/me/messages/${messageId}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: messageId }, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'move_message',
      {
        title: 'Move Message',
        description: 'Move a message to a different folder',
        inputSchema: {
          messageId: z.string().describe('Message ID to move'),
          destinationFolderId: z.string().describe('Destination folder ID or well-known name')
        }
      },
      async ({ messageId, destinationFolderId }) => {
        const result = await makeGraphRequest(`/me/messages/${messageId}/move`, 'POST', {
          destinationId: destinationFolderId
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== CALENDAR TOOLS ====================

    server.registerTool(
      'list_calendars',
      {
        title: 'List Calendars',
        description: 'List all calendars',
        inputSchema: {}
      },
      async () => {
        const result = await makeGraphRequest('/me/calendars');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_events',
      {
        title: 'List Calendar Events',
        description: 'List calendar events',
        inputSchema: {
          calendarId: z
            .string()
            .optional()
            .describe('Calendar ID (default: primary calendar)'),
          startDateTime: z.string().optional().describe('Start date/time filter (ISO 8601)'),
          endDateTime: z.string().optional().describe('End date/time filter (ISO 8601)'),
          top: z.number().optional().describe('Number of events to return (default: 25)')
        }
      },
      async ({ calendarId, startDateTime, endDateTime, top = 25 }) => {
        let endpoint = calendarId
          ? `/me/calendars/${calendarId}/events`
          : '/me/calendar/events';

        endpoint += `?$top=${top}&$orderby=start/dateTime`;

        if (startDateTime) {
          endpoint += `&$filter=start/dateTime ge '${startDateTime}'`;
        }
        if (endDateTime) {
          const filterPrefix = startDateTime ? ' and ' : '&$filter=';
          endpoint += `${filterPrefix}end/dateTime le '${endDateTime}'`;
        }

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_event',
      {
        title: 'Get Calendar Event',
        description: 'Get a specific calendar event',
        inputSchema: {
          eventId: z.string().describe('Event ID')
        }
      },
      async ({ eventId }) => {
        const result = await makeGraphRequest(`/me/events/${eventId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_event',
      {
        title: 'Create Calendar Event',
        description: 'Create a new calendar event',
        inputSchema: {
          subject: z.string().describe('Event subject/title'),
          startDateTime: z.string().describe('Start date/time (ISO 8601 format)'),
          endDateTime: z.string().describe('End date/time (ISO 8601 format)'),
          timeZone: z
            .string()
            .optional()
            .describe('Time zone (e.g., "Pacific Standard Time", default: UTC)'),
          location: z.string().optional().describe('Event location'),
          body: z.string().optional().describe('Event description'),
          attendees: z.array(z.string()).optional().describe('Attendee email addresses'),
          isOnlineMeeting: z.boolean().optional().describe('Create as online meeting'),
          reminderMinutesBeforeStart: z
            .number()
            .optional()
            .describe('Reminder minutes before start')
        }
      },
      async input => {
        const event: any = {
          subject: input.subject,
          start: {
            dateTime: input.startDateTime,
            timeZone: input.timeZone || 'UTC'
          },
          end: {
            dateTime: input.endDateTime,
            timeZone: input.timeZone || 'UTC'
          }
        };

        if (input.location) {
          event.location = { displayName: input.location };
        }

        if (input.body) {
          event.body = {
            contentType: 'HTML',
            content: input.body
          };
        }

        if (input.attendees) {
          event.attendees = input.attendees.map(email => ({
            emailAddress: { address: email },
            type: 'required'
          }));
        }

        if (input.isOnlineMeeting) {
          event.isOnlineMeeting = true;
          event.onlineMeetingProvider = 'teamsForBusiness';
        }

        if (input.reminderMinutesBeforeStart !== undefined) {
          event.reminderMinutesBeforeStart = input.reminderMinutesBeforeStart;
        }

        const result = await makeGraphRequest('/me/events', 'POST', event);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_event',
      {
        title: 'Update Calendar Event',
        description: 'Update an existing calendar event',
        inputSchema: {
          eventId: z.string().describe('Event ID to update'),
          subject: z.string().optional().describe('Event subject/title'),
          startDateTime: z.string().optional().describe('Start date/time (ISO 8601)'),
          endDateTime: z.string().optional().describe('End date/time (ISO 8601)'),
          location: z.string().optional().describe('Event location'),
          body: z.string().optional().describe('Event description')
        }
      },
      async ({ eventId, ...updates }) => {
        const event: any = {};

        if (updates.subject) event.subject = updates.subject;
        if (updates.startDateTime) {
          event.start = { dateTime: updates.startDateTime, timeZone: 'UTC' };
        }
        if (updates.endDateTime) {
          event.end = { dateTime: updates.endDateTime, timeZone: 'UTC' };
        }
        if (updates.location) {
          event.location = { displayName: updates.location };
        }
        if (updates.body) {
          event.body = { contentType: 'HTML', content: updates.body };
        }

        const result = await makeGraphRequest(`/me/events/${eventId}`, 'PATCH', event);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_event',
      {
        title: 'Delete Calendar Event',
        description: 'Delete a calendar event',
        inputSchema: {
          eventId: z.string().describe('Event ID to delete')
        }
      },
      async ({ eventId }) => {
        const result = await makeGraphRequest(`/me/events/${eventId}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: eventId }, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'respond_to_event',
      {
        title: 'Respond to Event',
        description: 'Accept, tentatively accept, or decline a meeting invitation',
        inputSchema: {
          eventId: z.string().describe('Event ID'),
          response: z
            .enum(['accept', 'tentativelyAccept', 'decline'])
            .describe('Response type'),
          comment: z.string().optional().describe('Optional comment with response')
        }
      },
      async ({ eventId, response, comment }) => {
        const body: any = { sendResponse: true };
        if (comment) body.comment = comment;

        const result: any = await makeGraphRequest(
          `/me/events/${eventId}/${response}`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, response, ...result }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== CONTACTS TOOLS ====================

    server.registerTool(
      'list_contacts',
      {
        title: 'List Contacts',
        description: "List contacts from the user's contact folders",
        inputSchema: {
          top: z.number().optional().describe('Number of contacts to return (default: 50)'),
          orderBy: z.string().optional().describe('Order by field (default: displayName)')
        }
      },
      async ({ top = 50, orderBy = 'displayName' }) => {
        const result = await makeGraphRequest(`/me/contacts?$top=${top}&$orderby=${orderBy}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_contact',
      {
        title: 'Get Contact',
        description: 'Get a specific contact',
        inputSchema: {
          contactId: z.string().describe('Contact ID')
        }
      },
      async ({ contactId }) => {
        const result = await makeGraphRequest(`/me/contacts/${contactId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_contact',
      {
        title: 'Create Contact',
        description: 'Create a new contact',
        inputSchema: {
          givenName: z.string().optional().describe('First name'),
          surname: z.string().optional().describe('Last name'),
          emailAddresses: z.array(z.string()).optional().describe('Email addresses'),
          businessPhones: z.array(z.string()).optional().describe('Business phone numbers'),
          mobilePhone: z.string().optional().describe('Mobile phone'),
          jobTitle: z.string().optional().describe('Job title'),
          companyName: z.string().optional().describe('Company name')
        }
      },
      async input => {
        const contact: any = {};

        if (input.givenName) contact.givenName = input.givenName;
        if (input.surname) contact.surname = input.surname;
        if (input.emailAddresses) {
          contact.emailAddresses = input.emailAddresses.map(email => ({
            address: email,
            name: email
          }));
        }
        if (input.businessPhones) contact.businessPhones = input.businessPhones;
        if (input.mobilePhone) contact.mobilePhone = input.mobilePhone;
        if (input.jobTitle) contact.jobTitle = input.jobTitle;
        if (input.companyName) contact.companyName = input.companyName;

        const result = await makeGraphRequest('/me/contacts', 'POST', contact);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_contact',
      {
        title: 'Delete Contact',
        description: 'Delete a contact',
        inputSchema: {
          contactId: z.string().describe('Contact ID to delete')
        }
      },
      async ({ contactId }) => {
        const result = await makeGraphRequest(`/me/contacts/${contactId}`, 'DELETE');
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

    // ==================== ONEDRIVE/FILES TOOLS ====================

    server.registerTool(
      'list_drive_items',
      {
        title: 'List Drive Items',
        description: 'List files and folders in OneDrive',
        inputSchema: {
          folderId: z.string().optional().describe('Folder ID (default: root folder)'),
          top: z.number().optional().describe('Number of items to return (default: 50)')
        }
      },
      async ({ folderId, top = 50 }) => {
        const endpoint = folderId
          ? `/me/drive/items/${folderId}/children?$top=${top}`
          : `/me/drive/root/children?$top=${top}`;

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_drive_item',
      {
        title: 'Get Drive Item',
        description: 'Get metadata for a specific file or folder',
        inputSchema: {
          itemId: z.string().describe('Item ID')
        }
      },
      async ({ itemId }) => {
        const result = await makeGraphRequest(`/me/drive/items/${itemId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_drive_items',
      {
        title: 'Search Drive Items',
        description: 'Search for files and folders in OneDrive',
        inputSchema: {
          query: z.string().describe('Search query'),
          top: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ query, top = 25 }) => {
        const result = await makeGraphRequest(
          `/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${top}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_folder',
      {
        title: 'Create Folder',
        description: 'Create a new folder in OneDrive',
        inputSchema: {
          name: z.string().describe('Folder name'),
          parentFolderId: z.string().optional().describe('Parent folder ID (default: root)')
        }
      },
      async ({ name, parentFolderId }) => {
        const endpoint = parentFolderId
          ? `/me/drive/items/${parentFolderId}/children`
          : '/me/drive/root/children';

        const result = await makeGraphRequest(endpoint, 'POST', {
          name,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_drive_item',
      {
        title: 'Delete Drive Item',
        description: 'Delete a file or folder',
        inputSchema: {
          itemId: z.string().describe('Item ID to delete')
        }
      },
      async ({ itemId }) => {
        const result = await makeGraphRequest(`/me/drive/items/${itemId}`, 'DELETE');
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, deleted: itemId }, null, 2) }
          ]
        };
      }
    );

    server.registerTool(
      'share_drive_item',
      {
        title: 'Share Drive Item',
        description: 'Create a sharing link for a file or folder',
        inputSchema: {
          itemId: z.string().describe('Item ID to share'),
          type: z.enum(['view', 'edit']).describe('Link type'),
          scope: z
            .enum(['anonymous', 'organization'])
            .optional()
            .describe('Link scope (default: organization)')
        }
      },
      async ({ itemId, type, scope = 'organization' }) => {
        const result = await makeGraphRequest(`/me/drive/items/${itemId}/createLink`, 'POST', {
          type,
          scope
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== SHAREPOINT TOOLS ====================

    server.registerTool(
      'list_sharepoint_sites',
      {
        title: 'List SharePoint Sites',
        description: 'List SharePoint sites the user has access to',
        inputSchema: {
          search: z.string().optional().describe('Search query'),
          top: z.number().optional().describe('Number of sites to return (default: 25)')
        }
      },
      async ({ search, top = 25 }) => {
        let endpoint = `/sites?$top=${top}`;
        if (search) {
          endpoint = `/sites?search=${encodeURIComponent(search)}&$top=${top}`;
        }

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_site',
      {
        title: 'Get SharePoint Site',
        description: 'Get a specific SharePoint site',
        inputSchema: {
          siteId: z.string().describe('Site ID')
        }
      },
      async ({ siteId }) => {
        const result = await makeGraphRequest(`/sites/${siteId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_site_lists',
      {
        title: 'List Site Lists',
        description: 'List all lists in a SharePoint site',
        inputSchema: {
          siteId: z.string().describe('Site ID')
        }
      },
      async ({ siteId }) => {
        const result = await makeGraphRequest(`/sites/${siteId}/lists`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_site_pages',
      {
        title: 'List Site Pages',
        description: 'List pages in a SharePoint site',
        inputSchema: {
          siteId: z.string().describe('Site ID')
        }
      },
      async ({ siteId }) => {
        const result = await makeGraphRequest(`/sites/${siteId}/pages`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ONENOTE TOOLS ====================

    server.registerTool(
      'list_notebooks',
      {
        title: 'List OneNote Notebooks',
        description: 'List all OneNote notebooks',
        inputSchema: {}
      },
      async () => {
        const result = await makeGraphRequest('/me/onenote/notebooks');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_sections',
      {
        title: 'List OneNote Sections',
        description: 'List sections in a notebook',
        inputSchema: {
          notebookId: z.string().optional().describe('Notebook ID (omit to list all sections)')
        }
      },
      async ({ notebookId }) => {
        const endpoint = notebookId
          ? `/me/onenote/notebooks/${notebookId}/sections`
          : '/me/onenote/sections';

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_pages',
      {
        title: 'List OneNote Pages',
        description: 'List pages in a section',
        inputSchema: {
          sectionId: z.string().describe('Section ID')
        }
      },
      async ({ sectionId }) => {
        const result = await makeGraphRequest(`/me/onenote/sections/${sectionId}/pages`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_page_content',
      {
        title: 'Get OneNote Page Content',
        description: 'Get the HTML content of a OneNote page',
        inputSchema: {
          pageId: z.string().describe('Page ID')
        }
      },
      async ({ pageId }) => {
        const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${pageId}/content`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.token}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Microsoft Graph API error: ${response.status} - ${errorText}`);
        }

        const content = await response.text();
        return {
          content: [{ type: 'text', text: content }]
        };
      }
    );

    // ==================== TODO/TASKS TOOLS ====================

    server.registerTool(
      'list_todo_lists',
      {
        title: 'List To Do Lists',
        description: 'List all Microsoft To Do task lists',
        inputSchema: {}
      },
      async () => {
        const result = await makeGraphRequest('/me/todo/lists');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_tasks',
      {
        title: 'List Tasks',
        description: 'List tasks in a To Do list',
        inputSchema: {
          listId: z.string().describe('Task list ID'),
          filter: z
            .string()
            .optional()
            .describe('OData filter (e.g., "status ne \'completed\'"')
        }
      },
      async ({ listId, filter }) => {
        let endpoint = `/me/todo/lists/${listId}/tasks`;
        if (filter) {
          endpoint += `?$filter=${encodeURIComponent(filter)}`;
        }

        const result = await makeGraphRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_task',
      {
        title: 'Create Task',
        description: 'Create a new task in Microsoft To Do',
        inputSchema: {
          listId: z.string().describe('Task list ID'),
          title: z.string().describe('Task title'),
          body: z.string().optional().describe('Task description'),
          dueDateTime: z.string().optional().describe('Due date/time (ISO 8601)'),
          importance: z.enum(['low', 'normal', 'high']).optional().describe('Task importance'),
          reminderDateTime: z.string().optional().describe('Reminder date/time (ISO 8601)')
        }
      },
      async input => {
        const task: any = {
          title: input.title
        };

        if (input.body) {
          task.body = {
            content: input.body,
            contentType: 'text'
          };
        }

        if (input.dueDateTime) {
          task.dueDateTime = {
            dateTime: input.dueDateTime,
            timeZone: 'UTC'
          };
        }

        if (input.importance) {
          task.importance = input.importance;
        }

        if (input.reminderDateTime) {
          task.reminderDateTime = {
            dateTime: input.reminderDateTime,
            timeZone: 'UTC'
          };
        }

        const result = await makeGraphRequest(
          `/me/todo/lists/${input.listId}/tasks`,
          'POST',
          task
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_task',
      {
        title: 'Update Task',
        description: 'Update an existing task',
        inputSchema: {
          listId: z.string().describe('Task list ID'),
          taskId: z.string().describe('Task ID'),
          title: z.string().optional().describe('Task title'),
          status: z
            .enum(['notStarted', 'inProgress', 'completed'])
            .optional()
            .describe('Task status'),
          importance: z.enum(['low', 'normal', 'high']).optional().describe('Task importance')
        }
      },
      async ({ listId, taskId, ...updates }) => {
        const task: any = {};

        if (updates.title) task.title = updates.title;
        if (updates.status) task.status = updates.status;
        if (updates.importance) task.importance = updates.importance;

        const result = await makeGraphRequest(
          `/me/todo/lists/${listId}/tasks/${taskId}`,
          'PATCH',
          task
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== TEAMS TOOLS ====================

    server.registerTool(
      'list_teams',
      {
        title: 'List Teams',
        description: 'List all teams the user is a member of',
        inputSchema: {}
      },
      async () => {
        const result = await makeGraphRequest('/me/joinedTeams');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_channels',
      {
        title: 'List Team Channels',
        description: 'List channels in a team',
        inputSchema: {
          teamId: z.string().describe('Team ID')
        }
      },
      async ({ teamId }) => {
        const result = await makeGraphRequest(`/teams/${teamId}/channels`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_channel_messages',
      {
        title: 'List Channel Messages',
        description: 'List messages in a team channel',
        inputSchema: {
          teamId: z.string().describe('Team ID'),
          channelId: z.string().describe('Channel ID'),
          top: z.number().optional().describe('Number of messages to return (default: 50)')
        }
      },
      async ({ teamId, channelId, top = 50 }) => {
        const result = await makeGraphRequest(
          `/teams/${teamId}/channels/${channelId}/messages?$top=${top}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'send_channel_message',
      {
        title: 'Send Channel Message',
        description: 'Send a message to a Teams channel',
        inputSchema: {
          teamId: z.string().describe('Team ID'),
          channelId: z.string().describe('Channel ID'),
          content: z.string().describe('Message content (HTML)')
        }
      },
      async ({ teamId, channelId, content }) => {
        const message = {
          body: {
            content,
            contentType: 'html'
          }
        };

        const result = await makeGraphRequest(
          `/teams/${teamId}/channels/${channelId}/messages`,
          'POST',
          message
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
