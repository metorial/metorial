import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Google Calendar MCP Server
 * Provides tools and resources for interacting with Google Calendar API
 */

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
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar'
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

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'google-calendar-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

    /**
     * Helper function to make authenticated requests to Google Calendar API
     */
    async function makeCalendarRequest(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<any> {
      const url = `${CALENDAR_API_BASE}${endpoint}`;
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }

    /**
     * Format event data for readable output
     */
    function formatEvent(event: any): string {
      const lines = [
        `Event: ${event.summary || 'Untitled'}`,
        `ID: ${event.id}`,
        `Status: ${event.status}`
      ];

      if (event.description) {
        lines.push(`Description: ${event.description}`);
      }

      if (event.location) {
        lines.push(`Location: ${event.location}`);
      }

      if (event.start) {
        const startTime = event.start.dateTime || event.start.date;
        lines.push(`Start: ${startTime}`);
      }

      if (event.end) {
        const endTime = event.end.dateTime || event.end.date;
        lines.push(`End: ${endTime}`);
      }

      if (event.attendees && event.attendees.length > 0) {
        lines.push(`Attendees: ${event.attendees.map((a: any) => a.email).join(', ')}`);
      }

      if (event.creator) {
        lines.push(`Creator: ${event.creator.email}`);
      }

      if (event.organizer) {
        lines.push(`Organizer: ${event.organizer.email}`);
      }

      if (event.htmlLink) {
        lines.push(`Link: ${event.htmlLink}`);
      }

      return lines.join('\n');
    }

    /**
     * Format calendar data for readable output
     */
    function formatCalendar(calendar: any): string {
      const lines = [`Calendar: ${calendar.summary}`, `ID: ${calendar.id}`];

      if (calendar.description) {
        lines.push(`Description: ${calendar.description}`);
      }

      if (calendar.timeZone) {
        lines.push(`Timezone: ${calendar.timeZone}`);
      }

      if (calendar.accessRole) {
        lines.push(`Access Role: ${calendar.accessRole}`);
      }

      if (calendar.primary) {
        lines.push('Primary: Yes');
      }

      return lines.join('\n');
    }

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * List all calendars accessible to the user
     */
    server.registerTool(
      'list_calendars',
      {
        title: 'List Calendars',
        description: 'Get all calendars accessible to the user',
        inputSchema: {
          minAccessRole: z
            .enum(['freeBusyReader', 'reader', 'writer', 'owner'])
            .optional()
            .describe('Minimum access role filter'),
          showHidden: z.boolean().optional().describe('Whether to show hidden calendars')
        }
      },
      async ({ minAccessRole, showHidden }) => {
        const params = new URLSearchParams();
        if (minAccessRole) params.append('minAccessRole', minAccessRole);
        if (showHidden !== undefined) params.append('showHidden', String(showHidden));

        const data = await makeCalendarRequest(`/users/me/calendarList?${params.toString()}`);

        const calendarsList = data.items
          .map((cal: any) => formatCalendar(cal))
          .join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.items.length} calendar(s):\n\n${calendarsList}`
            }
          ]
        };
      }
    );

    /**
     * Create a new calendar event
     */
    server.registerTool(
      'create_event',
      {
        title: 'Create Event',
        description: 'Create a new calendar event',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID (use "primary" for primary calendar)'),
          summary: z.string().describe('Event title/summary'),
          description: z.string().optional().describe('Event description'),
          location: z.string().optional().describe('Event location'),
          startDateTime: z
            .string()
            .describe('Start date-time in ISO 8601 format (e.g., 2024-01-15T10:00:00-05:00)'),
          endDateTime: z.string().describe('End date-time in ISO 8601 format'),
          timeZone: z.string().optional().describe('Timezone (e.g., America/New_York)'),
          attendees: z
            .array(z.string())
            .optional()
            .describe('List of attendee email addresses'),
          sendUpdates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe('Whether to send notifications')
        }
      },
      async ({
        calendarId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone,
        attendees,
        sendUpdates
      }) => {
        const eventData: any = {
          summary,
          start: {
            dateTime: startDateTime,
            timeZone: timeZone || 'UTC'
          },
          end: {
            dateTime: endDateTime,
            timeZone: timeZone || 'UTC'
          }
        };

        if (description) eventData.description = description;
        if (location) eventData.location = location;
        if (attendees && attendees.length > 0) {
          eventData.attendees = attendees.map(email => ({ email }));
        }

        const params = new URLSearchParams();
        if (sendUpdates) params.append('sendUpdates', sendUpdates);

        const event = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events?${params.toString()}`,
          {
            method: 'POST',
            body: JSON.stringify(eventData)
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Event created successfully!\n\n${formatEvent(event)}`
            }
          ]
        };
      }
    );

    /**
     * Update an existing calendar event
     */
    server.registerTool(
      'update_event',
      {
        title: 'Update Event',
        description: 'Update an existing calendar event',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID'),
          eventId: z.string().describe('Event ID'),
          summary: z.string().optional().describe('Event title/summary'),
          description: z.string().optional().describe('Event description'),
          location: z.string().optional().describe('Event location'),
          startDateTime: z.string().optional().describe('Start date-time in ISO 8601 format'),
          endDateTime: z.string().optional().describe('End date-time in ISO 8601 format'),
          timeZone: z.string().optional().describe('Timezone'),
          attendees: z
            .array(z.string())
            .optional()
            .describe('List of attendee email addresses'),
          sendUpdates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe('Whether to send notifications')
        }
      },
      async ({
        calendarId,
        eventId,
        summary,
        description,
        location,
        startDateTime,
        endDateTime,
        timeZone,
        attendees,
        sendUpdates
      }) => {
        // First get the current event
        const currentEvent = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(
            eventId as string
          )}`
        );

        // Update only provided fields
        const eventData: any = { ...currentEvent };

        if (summary !== undefined) eventData.summary = summary;
        if (description !== undefined) eventData.description = description;
        if (location !== undefined) eventData.location = location;

        if (startDateTime) {
          eventData.start = {
            dateTime: startDateTime,
            timeZone: timeZone || eventData.start.timeZone || 'UTC'
          };
        }

        if (endDateTime) {
          eventData.end = {
            dateTime: endDateTime,
            timeZone: timeZone || eventData.end.timeZone || 'UTC'
          };
        }

        if (attendees !== undefined) {
          eventData.attendees = attendees.map(email => ({ email }));
        }

        const params = new URLSearchParams();
        if (sendUpdates) params.append('sendUpdates', sendUpdates);

        const event = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(
            eventId
          )}?${params.toString()}`,
          {
            method: 'PUT',
            body: JSON.stringify(eventData)
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Event updated successfully!\n\n${formatEvent(event)}`
            }
          ]
        };
      }
    );

    /**
     * Delete a calendar event
     */
    server.registerTool(
      'delete_event',
      {
        title: 'Delete Event',
        description: 'Delete a calendar event',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID'),
          eventId: z.string().describe('Event ID'),
          sendUpdates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe('Whether to send notifications')
        }
      },
      async ({ calendarId, eventId, sendUpdates }) => {
        const params = new URLSearchParams();
        if (sendUpdates) params.append('sendUpdates', sendUpdates);

        await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(
            eventId
          )}?${params.toString()}`,
          {
            method: 'DELETE'
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Event ${eventId} deleted successfully from calendar ${calendarId}`
            }
          ]
        };
      }
    );

    /**
     * List events within a time range
     */
    server.registerTool(
      'list_events',
      {
        title: 'List Events',
        description: 'List events within a specified time range',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID (use "primary" for primary calendar)'),
          timeMin: z.string().optional().describe('Start of time range (ISO 8601 format)'),
          timeMax: z.string().optional().describe('End of time range (ISO 8601 format)'),
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of events to return (default 250)'),
          orderBy: z.enum(['startTime', 'updated']).optional().describe('Order of results'),
          query: z.string().optional().describe('Free text search terms')
        }
      },
      async ({ calendarId, timeMin, timeMax, maxResults, orderBy, query }) => {
        const params = new URLSearchParams();
        if (timeMin) params.append('timeMin', timeMin);
        if (timeMax) params.append('timeMax', timeMax);
        if (maxResults) params.append('maxResults', String(maxResults));
        if (orderBy) {
          params.append('orderBy', orderBy);
          params.append('singleEvents', 'true'); // Required for orderBy
        }
        if (query) params.append('q', query);

        const data = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events?${params.toString()}`
        );

        if (!data.items || data.items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No events found in the specified time range.'
              }
            ]
          };
        }

        const eventsList = data.items
          .map((event: any) => formatEvent(event))
          .join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.items.length} event(s):\n\n${eventsList}`
            }
          ]
        };
      }
    );

    /**
     * Quick add event using natural language
     */
    server.registerTool(
      'quick_add_event',
      {
        title: 'Quick Add Event',
        description:
          'Create an event using natural language (e.g., "Dinner with John tomorrow at 7pm")',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID (use "primary" for primary calendar)'),
          text: z.string().describe('Natural language description of the event'),
          sendUpdates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe('Whether to send notifications')
        }
      },
      async ({ calendarId, text, sendUpdates }) => {
        const params = new URLSearchParams();
        params.append('text', text);
        if (sendUpdates) params.append('sendUpdates', sendUpdates);

        const event = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(
            calendarId as string
          )}/events/quickAdd?${params.toString()}`,
          {
            method: 'POST'
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Event created successfully!\n\n${formatEvent(event)}`
            }
          ]
        };
      }
    );

    /**
     * Move an event to a different calendar
     */
    server.registerTool(
      'move_event',
      {
        title: 'Move Event',
        description: 'Move an event to a different calendar',
        inputSchema: {
          sourceCalendarId: z.string().describe('Source calendar ID'),
          eventId: z.string().describe('Event ID'),
          destinationCalendarId: z.string().describe('Destination calendar ID'),
          sendUpdates: z
            .enum(['all', 'externalOnly', 'none'])
            .optional()
            .describe('Whether to send notifications')
        }
      },
      async ({ sourceCalendarId, eventId, destinationCalendarId, sendUpdates }) => {
        const params = new URLSearchParams();
        params.append('destination', destinationCalendarId);
        if (sendUpdates) params.append('sendUpdates', sendUpdates);

        const event = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(sourceCalendarId)}/events/${encodeURIComponent(
            eventId
          )}/move?${params.toString()}`,
          {
            method: 'POST'
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Event moved successfully to calendar ${destinationCalendarId}!\n\n${formatEvent(
                event
              )}`
            }
          ]
        };
      }
    );

    /**
     * Create a new calendar
     */
    server.registerTool(
      'create_calendar',
      {
        title: 'Create Calendar',
        description: 'Create a new calendar',
        inputSchema: {
          summary: z.string().describe('Calendar name/title'),
          description: z.string().optional().describe('Calendar description'),
          timeZone: z
            .string()
            .optional()
            .describe('Calendar timezone (e.g., America/New_York)')
        }
      },
      async ({ summary, description, timeZone }) => {
        const calendarData: any = { summary };
        if (description) calendarData.description = description;
        if (timeZone) calendarData.timeZone = timeZone;

        const calendar = await makeCalendarRequest('/calendars', {
          method: 'POST',
          body: JSON.stringify(calendarData)
        });

        return {
          content: [
            {
              type: 'text',
              text: `Calendar created successfully!\n\n${formatCalendar(calendar)}`
            }
          ]
        };
      }
    );

    /**
     * Update calendar properties
     */
    server.registerTool(
      'update_calendar',
      {
        title: 'Update Calendar',
        description: 'Update calendar properties',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID'),
          summary: z.string().optional().describe('Calendar name/title'),
          description: z.string().optional().describe('Calendar description'),
          timeZone: z.string().optional().describe('Calendar timezone')
        }
      },
      async ({ calendarId, summary, description, timeZone }) => {
        // Get current calendar
        const currentCalendar = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}`
        );

        const calendarData: any = { ...currentCalendar };
        if (summary !== undefined) calendarData.summary = summary;
        if (description !== undefined) calendarData.description = description;
        if (timeZone !== undefined) calendarData.timeZone = timeZone;

        const calendar = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}`,
          {
            method: 'PUT',
            body: JSON.stringify(calendarData)
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Calendar updated successfully!\n\n${formatCalendar(calendar)}`
            }
          ]
        };
      }
    );

    /**
     * Delete a calendar
     */
    server.registerTool(
      'delete_calendar',
      {
        title: 'Delete Calendar',
        description: 'Delete a calendar (WARNING: This cannot be undone)',
        inputSchema: {
          calendarId: z.string().describe('Calendar ID (cannot be "primary")')
        }
      },
      async ({ calendarId }) => {
        if (calendarId === 'primary') {
          throw new Error('Cannot delete primary calendar');
        }

        await makeCalendarRequest(`/calendars/${encodeURIComponent(calendarId as string)}`, {
          method: 'DELETE'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Calendar ${calendarId} deleted successfully`
            }
          ]
        };
      }
    );

    /**
     * Search for events across calendars
     */
    server.registerTool(
      'search_events',
      {
        title: 'Search Events',
        description: 'Search for events by query string',
        inputSchema: {
          calendarId: z
            .string()
            .describe('Calendar ID to search in (use "primary" for primary calendar)'),
          query: z.string().describe('Search query'),
          timeMin: z.string().optional().describe('Start of time range (ISO 8601 format)'),
          timeMax: z.string().optional().describe('End of time range (ISO 8601 format)'),
          maxResults: z.number().optional().describe('Maximum number of results (default 250)')
        }
      },
      async ({ calendarId, query, timeMin, timeMax, maxResults }) => {
        const params = new URLSearchParams();
        params.append('q', query);
        if (timeMin) params.append('timeMin', timeMin);
        if (timeMax) params.append('timeMax', timeMax);
        if (maxResults) params.append('maxResults', String(maxResults));

        const data = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events?${params.toString()}`
        );

        if (!data.items || data.items.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No events found matching query: "${query}"`
              }
            ]
          };
        }

        const eventsList = data.items
          .map((event: any) => formatEvent(event))
          .join('\n\n---\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${data.items.length} event(s) matching "${query}":\n\n${eventsList}`
            }
          ]
        };
      }
    );

    /**
     * Get free/busy information
     */
    server.registerTool(
      'get_freebusy',
      {
        title: 'Get Free/Busy Information',
        description: 'Check free/busy information for one or more calendars',
        inputSchema: {
          calendarIds: z.array(z.string()).describe('List of calendar IDs to check'),
          timeMin: z.string().describe('Start of time range (ISO 8601 format)'),
          timeMax: z.string().describe('End of time range (ISO 8601 format)')
        }
      },
      async ({ calendarIds, timeMin, timeMax }) => {
        const requestData = {
          timeMin,
          timeMax,
          items: calendarIds.map(id => ({ id }))
        };

        const data = await makeCalendarRequest('/freeBusy', {
          method: 'POST',
          body: JSON.stringify(requestData)
        });

        let result = `Free/Busy Information from ${timeMin} to ${timeMax}:\n\n`;

        for (const [calendarId, info] of Object.entries(data.calendars)) {
          const calInfo = info as any;
          result += `Calendar: ${calendarId}\n`;

          if (calInfo.errors && calInfo.errors.length > 0) {
            result += `  Errors: ${JSON.stringify(calInfo.errors)}\n`;
          } else if (calInfo.busy && calInfo.busy.length > 0) {
            result += `  Busy periods:\n`;
            for (const period of calInfo.busy) {
              result += `    ${period.start} - ${period.end}\n`;
            }
          } else {
            result += `  No busy periods (completely free)\n`;
          }
          result += '\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: result
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Get specific calendar details
     */
    server.registerResource(
      'calendar',
      new ResourceTemplate('calendar://{calendarId}', { list: undefined }),
      {
        title: 'Calendar Resource',
        description: 'Get details of a specific calendar'
      },
      async (uri, { calendarId }) => {
        const calendar = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              text: formatCalendar(calendar),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Resource: Get specific event details
     */
    server.registerResource(
      'calendar-event',
      new ResourceTemplate('calendar://{calendarId}/event/{eventId}', { list: undefined }),
      {
        title: 'Calendar Event Resource',
        description: 'Get details of a specific event'
      },
      async (uri, { calendarId, eventId }) => {
        const event = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events/${encodeURIComponent(
            eventId as string
          )}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              text: formatEvent(event),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Resource: Get upcoming events for a calendar
     */
    server.registerResource(
      'calendar-upcoming',
      new ResourceTemplate('calendar://{calendarId}/events/upcoming', { list: undefined }),
      {
        title: 'Upcoming Events Resource',
        description: 'Get upcoming events for a specific calendar'
      },
      async (uri, { calendarId }) => {
        const now = new Date().toISOString();
        const params = new URLSearchParams();
        params.append('timeMin', now);
        params.append('maxResults', '10');
        params.append('orderBy', 'startTime');
        params.append('singleEvents', 'true');

        const data = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events?${params.toString()}`
        );

        if (!data.items || data.items.length === 0) {
          return {
            contents: [
              {
                uri: uri.href,
                text: 'No upcoming events found.',
                mimeType: 'text/plain'
              }
            ]
          };
        }

        const eventsList = data.items
          .map((event: any) => formatEvent(event))
          .join('\n\n---\n\n');

        return {
          contents: [
            {
              uri: uri.href,
              text: `Next ${data.items.length} upcoming event(s):\n\n${eventsList}`,
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Resource: Get today's events for a calendar
     */
    server.registerResource(
      'calendar-today',
      new ResourceTemplate('calendar://{calendarId}/events/today', { list: undefined }),
      {
        title: "Today's Events Resource",
        description: "Get today's events for a specific calendar"
      },
      async (uri, { calendarId }) => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const params = new URLSearchParams();
        params.append('timeMin', startOfDay.toISOString());
        params.append('timeMax', endOfDay.toISOString());
        params.append('orderBy', 'startTime');
        params.append('singleEvents', 'true');

        const data = await makeCalendarRequest(
          `/calendars/${encodeURIComponent(calendarId as string)}/events?${params.toString()}`
        );

        if (!data.items || data.items.length === 0) {
          return {
            contents: [
              {
                uri: uri.href,
                text: 'No events scheduled for today.',
                mimeType: 'text/plain'
              }
            ]
          };
        }

        const eventsList = data.items
          .map((event: any) => formatEvent(event))
          .join('\n\n---\n\n');

        return {
          contents: [
            {
              uri: uri.href,
              text: `${data.items.length} event(s) today:\n\n${eventsList}`,
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Resource: Get primary calendar event (shorthand)
     */
    server.registerResource(
      'primary-event',
      new ResourceTemplate('calendar://primary/event/{eventId}', { list: undefined }),
      {
        title: 'Primary Calendar Event Resource',
        description: 'Get details of a specific event from the primary calendar'
      },
      async (uri, { eventId }) => {
        const event = await makeCalendarRequest(
          `/calendars/primary/events/${encodeURIComponent(eventId as string)}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              text: formatEvent(event),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    /**
     * Resource: Get primary calendar upcoming events (shorthand)
     */
    server.registerResource(
      'primary-upcoming',
      new ResourceTemplate('calendar://primary/events/upcoming', { list: undefined }),
      {
        title: 'Primary Calendar Upcoming Events Resource',
        description: 'Get upcoming events from the primary calendar'
      },
      async uri => {
        const now = new Date().toISOString();
        const params = new URLSearchParams();
        params.append('timeMin', now);
        params.append('maxResults', '10');
        params.append('orderBy', 'startTime');
        params.append('singleEvents', 'true');

        const data = await makeCalendarRequest(
          `/calendars/primary/events?${params.toString()}`
        );

        if (!data.items || data.items.length === 0) {
          return {
            contents: [
              {
                uri: uri.href,
                text: 'No upcoming events found in primary calendar.',
                mimeType: 'text/plain'
              }
            ]
          };
        }

        const eventsList = data.items
          .map((event: any) => formatEvent(event))
          .join('\n\n---\n\n');

        return {
          contents: [
            {
              uri: uri.href,
              text: `Next ${data.items.length} upcoming event(s) from primary calendar:\n\n${eventsList}`,
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );
  }
);
