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
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/gmail.settings.basic',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: scopes,
      state: input.state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
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
        code: code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: 'refresh_token'
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
    name: 'gmail-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Gmail API calls
    async function makeGmailRequest(endpoint: string, method: string = 'GET', body?: any) {
      const url = `https://gmail.googleapis.com/gmail/v1${endpoint}`;

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
        throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // Helper to encode email for sending
    function createMimeMessage(
      to: string[],
      subject: string,
      body: string,
      from?: string,
      cc?: string[],
      bcc?: string[],
      isHtml: boolean = false
    ) {
      const boundary = '----=_Part_' + Date.now();
      let message = '';

      if (from) message += `From: ${from}\r\n`;
      message += `To: ${to.join(', ')}\r\n`;
      if (cc && cc.length > 0) message += `Cc: ${cc.join(', ')}\r\n`;
      if (bcc && bcc.length > 0) message += `Bcc: ${bcc.join(', ')}\r\n`;
      message += `Subject: ${subject}\r\n`;
      message += `MIME-Version: 1.0\r\n`;
      message += `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8\r\n`;
      message += `\r\n${body}`;

      return btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    // ==================== MESSAGE TOOLS ====================

    server.registerTool(
      'list_messages',
      {
        title: 'List Messages',
        description: 'List messages in mailbox',
        inputSchema: {
          query: z.string().optional().describe('Search query (Gmail search syntax)'),
          labelIds: z.array(z.string()).optional().describe('Label IDs to filter by'),
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of messages (default: 100, max: 500)'),
          includeSpamTrash: z
            .boolean()
            .optional()
            .describe('Include spam and trash (default: false)')
        }
      },
      async ({ query, labelIds, maxResults = 100, includeSpamTrash = false }) => {
        let endpoint = `/users/me/messages?maxResults=${maxResults}`;

        if (query) endpoint += `&q=${encodeURIComponent(query)}`;
        if (labelIds && labelIds.length > 0)
          endpoint += `&labelIds=${labelIds.join('&labelIds=')}`;
        if (includeSpamTrash) endpoint += '&includeSpamTrash=true';

        const result = await makeGmailRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_message',
      {
        title: 'Get Message',
        description: 'Get a specific message by ID',
        inputSchema: {
          messageId: z.string().describe('Message ID'),
          format: z
            .enum(['minimal', 'full', 'raw', 'metadata'])
            .optional()
            .describe('Message format (default: full)')
        }
      },
      async ({ messageId, format = 'full' }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}?format=${format}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'send_message',
      {
        title: 'Send Message',
        description: 'Send an email message',
        inputSchema: {
          to: z.array(z.string()).describe('Recipient email addresses'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body'),
          isHtml: z.boolean().optional().describe('Whether body is HTML (default: false)'),
          cc: z.array(z.string()).optional().describe('CC recipients'),
          bcc: z.array(z.string()).optional().describe('BCC recipients'),
          from: z.string().optional().describe('From address (if you have multiple)')
        }
      },
      async input => {
        const raw = createMimeMessage(
          input.to,
          input.subject,
          input.body,
          input.from,
          input.cc,
          input.bcc,
          input.isHtml
        );

        const result = await makeGmailRequest('/users/me/messages/send', 'POST', { raw });
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
          body: z.string().describe('Reply body'),
          isHtml: z.boolean().optional().describe('Whether body is HTML (default: false)'),
          replyAll: z.boolean().optional().describe('Reply to all recipients (default: false)')
        }
      },
      async ({ messageId, body, isHtml = false, replyAll = false }) => {
        // Get original message
        const originalMessage = (await makeGmailRequest(
          `/users/me/messages/${messageId}?format=full`
        )) as any;

        // Extract headers
        const headers = originalMessage.payload.headers;
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const originalFrom = getHeader('From');
        const originalTo = getHeader('To');
        const originalCc = getHeader('Cc');
        const originalSubject = getHeader('Subject');
        const messageIdHeader = getHeader('Message-ID');

        // Build recipient list
        let to = [originalFrom];
        let cc: string[] = [];

        if (replyAll) {
          const allRecipients = [originalTo, originalCc].filter(Boolean).join(',');
          const recipientList = allRecipients
            .split(',')
            .map(r => r.trim())
            .filter(Boolean);
          to = [originalFrom, ...recipientList];
          cc = recipientList;
        }

        const subject = originalSubject.startsWith('Re:')
          ? originalSubject
          : `Re: ${originalSubject}`;

        let message = `To: ${to.join(', ')}\r\n`;
        if (cc.length > 0) message += `Cc: ${cc.join(', ')}\r\n`;
        message += `Subject: ${subject}\r\n`;
        message += `In-Reply-To: ${messageIdHeader}\r\n`;
        message += `References: ${messageIdHeader}\r\n`;
        message += `MIME-Version: 1.0\r\n`;
        message += `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8\r\n`;
        message += `\r\n${body}`;

        const raw = btoa(unescape(encodeURIComponent(message)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const result = await makeGmailRequest('/users/me/messages/send', 'POST', {
          raw,
          threadId: originalMessage.threadId
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'forward_message',
      {
        title: 'Forward Message',
        description: 'Forward an email message',
        inputSchema: {
          messageId: z.string().describe('Message ID to forward'),
          to: z.array(z.string()).describe('Recipients to forward to'),
          body: z.string().optional().describe('Additional message to include'),
          isHtml: z.boolean().optional().describe('Whether body is HTML (default: false)')
        }
      },
      async ({ messageId, to, body = '', isHtml = false }) => {
        const originalMessage = (await makeGmailRequest(
          `/users/me/messages/${messageId}?format=full`
        )) as any;

        const headers = originalMessage.payload.headers;
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const originalSubject = getHeader('Subject');
        const subject = originalSubject.startsWith('Fwd:')
          ? originalSubject
          : `Fwd: ${originalSubject}`;

        const forwardedBody = body
          ? `${body}\n\n---------- Forwarded message ---------\n`
          : '---------- Forwarded message ---------\n';

        const raw = createMimeMessage(
          to,
          subject,
          forwardedBody,
          undefined,
          undefined,
          undefined,
          isHtml
        );

        const result = await makeGmailRequest('/users/me/messages/send', 'POST', { raw });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_message',
      {
        title: 'Delete Message',
        description: 'Permanently delete a message',
        inputSchema: {
          messageId: z.string().describe('Message ID to delete')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(`/users/me/messages/${messageId}`, 'DELETE');
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
      'trash_message',
      {
        title: 'Trash Message',
        description: 'Move a message to trash',
        inputSchema: {
          messageId: z.string().describe('Message ID to trash')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(`/users/me/messages/${messageId}/trash`, 'POST');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'untrash_message',
      {
        title: 'Untrash Message',
        description: 'Remove a message from trash',
        inputSchema: {
          messageId: z.string().describe('Message ID to untrash')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/untrash`,
          'POST'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'modify_message',
      {
        title: 'Modify Message',
        description: 'Modify message labels',
        inputSchema: {
          messageId: z.string().describe('Message ID'),
          addLabelIds: z.array(z.string()).optional().describe('Label IDs to add'),
          removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove')
        }
      },
      async ({ messageId, addLabelIds, removeLabelIds }) => {
        const body: any = {};
        if (addLabelIds) body.addLabelIds = addLabelIds;
        if (removeLabelIds) body.removeLabelIds = removeLabelIds;

        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          body
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'mark_as_read',
      {
        title: 'Mark as Read',
        description: 'Mark a message as read',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            removeLabelIds: ['UNREAD']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'mark_as_unread',
      {
        title: 'Mark as Unread',
        description: 'Mark a message as unread',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            addLabelIds: ['UNREAD']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'star_message',
      {
        title: 'Star Message',
        description: 'Add star to a message',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            addLabelIds: ['STARRED']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'unstar_message',
      {
        title: 'Unstar Message',
        description: 'Remove star from a message',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            removeLabelIds: ['STARRED']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'mark_as_spam',
      {
        title: 'Mark as Spam',
        description: 'Mark a message as spam',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            addLabelIds: ['SPAM'],
            removeLabelIds: ['INBOX']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'mark_as_important',
      {
        title: 'Mark as Important',
        description: 'Mark a message as important',
        inputSchema: {
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ messageId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/modify`,
          'POST',
          {
            addLabelIds: ['IMPORTANT']
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== THREAD TOOLS ====================

    server.registerTool(
      'list_threads',
      {
        title: 'List Threads',
        description: 'List email threads',
        inputSchema: {
          query: z.string().optional().describe('Search query'),
          labelIds: z.array(z.string()).optional().describe('Label IDs to filter by'),
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of threads (default: 100)')
        }
      },
      async ({ query, labelIds, maxResults = 100 }) => {
        let endpoint = `/users/me/threads?maxResults=${maxResults}`;

        if (query) endpoint += `&q=${encodeURIComponent(query)}`;
        if (labelIds && labelIds.length > 0)
          endpoint += `&labelIds=${labelIds.join('&labelIds=')}`;

        const result = await makeGmailRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_thread',
      {
        title: 'Get Thread',
        description: 'Get a specific thread with all messages',
        inputSchema: {
          threadId: z.string().describe('Thread ID'),
          format: z
            .enum(['minimal', 'full', 'metadata'])
            .optional()
            .describe('Message format (default: full)')
        }
      },
      async ({ threadId, format = 'full' }) => {
        const result = await makeGmailRequest(
          `/users/me/threads/${threadId}?format=${format}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'modify_thread',
      {
        title: 'Modify Thread',
        description: 'Modify labels on all messages in a thread',
        inputSchema: {
          threadId: z.string().describe('Thread ID'),
          addLabelIds: z.array(z.string()).optional().describe('Label IDs to add'),
          removeLabelIds: z.array(z.string()).optional().describe('Label IDs to remove')
        }
      },
      async ({ threadId, addLabelIds, removeLabelIds }) => {
        const body: any = {};
        if (addLabelIds) body.addLabelIds = addLabelIds;
        if (removeLabelIds) body.removeLabelIds = removeLabelIds;

        const result = await makeGmailRequest(
          `/users/me/threads/${threadId}/modify`,
          'POST',
          body
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'trash_thread',
      {
        title: 'Trash Thread',
        description: 'Move all messages in a thread to trash',
        inputSchema: {
          threadId: z.string().describe('Thread ID')
        }
      },
      async ({ threadId }) => {
        const result = await makeGmailRequest(`/users/me/threads/${threadId}/trash`, 'POST');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_thread',
      {
        title: 'Delete Thread',
        description: 'Permanently delete a thread',
        inputSchema: {
          threadId: z.string().describe('Thread ID')
        }
      },
      async ({ threadId }) => {
        const result = await makeGmailRequest(`/users/me/threads/${threadId}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: threadId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== LABEL TOOLS ====================

    server.registerTool(
      'list_labels',
      {
        title: 'List Labels',
        description: 'List all labels in the mailbox',
        inputSchema: {}
      },
      async () => {
        const result = await makeGmailRequest('/users/me/labels');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_label',
      {
        title: 'Get Label',
        description: 'Get details of a specific label',
        inputSchema: {
          labelId: z.string().describe('Label ID')
        }
      },
      async ({ labelId }) => {
        const result = await makeGmailRequest(`/users/me/labels/${labelId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_label',
      {
        title: 'Create Label',
        description: 'Create a new label',
        inputSchema: {
          name: z.string().describe('Label name'),
          labelListVisibility: z
            .enum(['labelShow', 'labelShowIfUnread', 'labelHide'])
            .optional()
            .describe('Visibility in label list'),
          messageListVisibility: z
            .enum(['show', 'hide'])
            .optional()
            .describe('Visibility in message list'),
          color: z
            .object({
              textColor: z.string(),
              backgroundColor: z.string()
            })
            .optional()
            .describe('Label color')
        }
      },
      async input => {
        const label: any = {
          name: input.name
        };

        if (input.labelListVisibility) label.labelListVisibility = input.labelListVisibility;
        if (input.messageListVisibility)
          label.messageListVisibility = input.messageListVisibility;
        if (input.color) label.color = input.color;

        const result = await makeGmailRequest('/users/me/labels', 'POST', label);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_label',
      {
        title: 'Update Label',
        description: 'Update a label',
        inputSchema: {
          labelId: z.string().describe('Label ID'),
          name: z.string().optional().describe('New label name'),
          labelListVisibility: z
            .enum(['labelShow', 'labelShowIfUnread', 'labelHide'])
            .optional(),
          messageListVisibility: z.enum(['show', 'hide']).optional(),
          color: z
            .object({
              textColor: z.string(),
              backgroundColor: z.string()
            })
            .optional()
            .describe('Label color')
        }
      },
      async ({ labelId, ...updates }) => {
        const label: any = {};

        if (updates.name) label.name = updates.name;
        if (updates.labelListVisibility)
          label.labelListVisibility = updates.labelListVisibility;
        if (updates.messageListVisibility)
          label.messageListVisibility = updates.messageListVisibility;
        if (updates.color) label.color = updates.color;

        const result = await makeGmailRequest(`/users/me/labels/${labelId}`, 'PATCH', label);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_label',
      {
        title: 'Delete Label',
        description: 'Delete a label',
        inputSchema: {
          labelId: z.string().describe('Label ID to delete')
        }
      },
      async ({ labelId }) => {
        const result = await makeGmailRequest(`/users/me/labels/${labelId}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: labelId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== DRAFT TOOLS ====================

    server.registerTool(
      'list_drafts',
      {
        title: 'List Drafts',
        description: 'List all draft messages',
        inputSchema: {
          maxResults: z.number().optional().describe('Maximum number of drafts (default: 100)')
        }
      },
      async ({ maxResults = 100 }) => {
        const result = await makeGmailRequest(`/users/me/drafts?maxResults=${maxResults}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_draft',
      {
        title: 'Get Draft',
        description: 'Get a specific draft',
        inputSchema: {
          draftId: z.string().describe('Draft ID')
        }
      },
      async ({ draftId }) => {
        const result = await makeGmailRequest(`/users/me/drafts/${draftId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_draft',
      {
        title: 'Create Draft',
        description: 'Create a draft message',
        inputSchema: {
          to: z.array(z.string()).describe('Recipient email addresses'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body'),
          isHtml: z.boolean().optional().describe('Whether body is HTML (default: false)'),
          cc: z.array(z.string()).optional().describe('CC recipients'),
          bcc: z.array(z.string()).optional().describe('BCC recipients')
        }
      },
      async input => {
        const raw = createMimeMessage(
          input.to,
          input.subject,
          input.body,
          undefined,
          input.cc,
          input.bcc,
          input.isHtml
        );

        const result = await makeGmailRequest('/users/me/drafts', 'POST', {
          message: { raw }
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_draft',
      {
        title: 'Update Draft',
        description: 'Update an existing draft',
        inputSchema: {
          draftId: z.string().describe('Draft ID'),
          to: z.array(z.string()).describe('Recipient email addresses'),
          subject: z.string().describe('Email subject'),
          body: z.string().describe('Email body'),
          isHtml: z.boolean().optional().describe('Whether body is HTML (default: false)')
        }
      },
      async ({ draftId, ...input }) => {
        const raw = createMimeMessage(
          input.to,
          input.subject,
          input.body,
          undefined,
          undefined,
          undefined,
          input.isHtml
        );

        const result = await makeGmailRequest(`/users/me/drafts/${draftId}`, 'PUT', {
          message: { raw }
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'send_draft',
      {
        title: 'Send Draft',
        description: 'Send a draft message',
        inputSchema: {
          draftId: z.string().describe('Draft ID to send')
        }
      },
      async ({ draftId }) => {
        const result = await makeGmailRequest('/users/me/drafts/send', 'POST', {
          id: draftId
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_draft',
      {
        title: 'Delete Draft',
        description: 'Delete a draft',
        inputSchema: {
          draftId: z.string().describe('Draft ID to delete')
        }
      },
      async ({ draftId }) => {
        const result = await makeGmailRequest(`/users/me/drafts/${draftId}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: draftId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== FILTER TOOLS ====================

    server.registerTool(
      'list_filters',
      {
        title: 'List Filters',
        description: 'List all filters',
        inputSchema: {}
      },
      async () => {
        const result = await makeGmailRequest('/users/me/settings/filters');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_filter',
      {
        title: 'Create Filter',
        description: 'Create a new filter',
        inputSchema: {
          from: z.string().optional().describe('Filter messages from this sender'),
          to: z.string().optional().describe('Filter messages to this recipient'),
          subject: z.string().optional().describe('Filter messages with this subject'),
          query: z.string().optional().describe('Gmail search query'),
          addLabelIds: z.array(z.string()).optional().describe('Labels to add'),
          removeLabelIds: z.array(z.string()).optional().describe('Labels to remove'),
          forward: z.string().optional().describe('Forward to this email address')
        }
      },
      async ({ from, to, subject, query, addLabelIds, removeLabelIds, forward }) => {
        const criteria: any = {};
        if (from) criteria.from = from;
        if (to) criteria.to = to;
        if (subject) criteria.subject = subject;
        if (query) criteria.query = query;

        const action: any = {};
        if (addLabelIds) action.addLabelIds = addLabelIds;
        if (removeLabelIds) action.removeLabelIds = removeLabelIds;
        if (forward) action.forward = forward;

        const result = await makeGmailRequest('/users/me/settings/filters', 'POST', {
          criteria,
          action
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_filter',
      {
        title: 'Delete Filter',
        description: 'Delete a filter',
        inputSchema: {
          filterId: z.string().describe('Filter ID to delete')
        }
      },
      async ({ filterId }) => {
        const result = await makeGmailRequest(
          `/users/me/settings/filters/${filterId}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: filterId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== PROFILE/SETTINGS TOOLS ====================

    server.registerTool(
      'get_profile',
      {
        title: 'Get Profile',
        description: 'Get Gmail profile information',
        inputSchema: {}
      },
      async () => {
        const result = await makeGmailRequest('/users/me/profile');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_vacation_settings',
      {
        title: 'Get Vacation Settings',
        description: 'Get vacation/auto-reply settings',
        inputSchema: {}
      },
      async () => {
        const result = await makeGmailRequest('/users/me/settings/vacation');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_vacation_settings',
      {
        title: 'Update Vacation Settings',
        description: 'Update vacation/auto-reply settings',
        inputSchema: {
          enableAutoReply: z.boolean().describe('Enable or disable auto-reply'),
          responseSubject: z.string().optional().describe('Auto-reply subject'),
          responseBodyPlainText: z
            .string()
            .optional()
            .describe('Auto-reply body (plain text)'),
          responseBodyHtml: z.string().optional().describe('Auto-reply body (HTML)'),
          startTime: z.string().optional().describe('Start time (milliseconds since epoch)'),
          endTime: z.string().optional().describe('End time (milliseconds since epoch)')
        }
      },
      async input => {
        const settings: any = {
          enableAutoReply: input.enableAutoReply
        };

        if (input.responseSubject) settings.responseSubject = input.responseSubject;
        if (input.responseBodyPlainText)
          settings.responseBodyPlainText = input.responseBodyPlainText;
        if (input.responseBodyHtml) settings.responseBodyHtml = input.responseBodyHtml;
        if (input.startTime) settings.startTime = input.startTime;
        if (input.endTime) settings.endTime = input.endTime;

        const result = await makeGmailRequest('/users/me/settings/vacation', 'PUT', settings);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== SEARCH TOOLS ====================

    server.registerTool(
      'search_messages',
      {
        title: 'Search Messages',
        description: 'Search messages using Gmail search syntax',
        inputSchema: {
          query: z
            .string()
            .describe('Search query (e.g., "from:user@example.com subject:meeting")'),
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results (default: 100)')
        }
      },
      async ({ query, maxResults = 100 }) => {
        const result = await makeGmailRequest(
          `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_attachment',
      {
        title: 'Get Attachment',
        description: 'Get metadata for a message attachment',
        inputSchema: {
          messageId: z.string().describe('Message ID'),
          attachmentId: z.string().describe('Attachment ID')
        }
      },
      async ({ messageId, attachmentId }) => {
        const result = await makeGmailRequest(
          `/users/me/messages/${messageId}/attachments/${attachmentId}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
