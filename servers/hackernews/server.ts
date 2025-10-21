import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Hacker News MCP Server
 * Provides access to Hacker News stories, comments, users, and more
 * Uses the official Hacker News Firebase API
 */

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  deleted?: boolean;
  type: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
  by?: string;
  time?: number;
  text?: string;
  dead?: boolean;
  parent?: number;
  poll?: number;
  kids?: number[];
  url?: string;
  score?: number;
  title?: string;
  parts?: number[];
  descendants?: number;
}

interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

/**
 * Fetch data from Hacker News API
 */
async function fetchHN<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${HN_API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch from Hacker News: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

/**
 * Format an item for display
 */
function formatItem(item: HNItem): string {
  const lines: string[] = [];

  lines.push(`Type: ${item.type}`);
  lines.push(`ID: ${item.id}`);

  if (item.deleted) {
    lines.push('Status: DELETED');
    return lines.join('\n');
  }

  if (item.dead) {
    lines.push('Status: DEAD');
  }

  if (item.by) {
    lines.push(`Author: ${item.by}`);
  }

  if (item.time) {
    const date = new Date(item.time * 1000);
    lines.push(`Posted: ${date.toISOString()}`);
  }

  if (item.title) {
    lines.push(`Title: ${item.title}`);
  }

  if (item.url) {
    lines.push(`URL: ${item.url}`);
  }

  if (item.score !== undefined) {
    lines.push(`Score: ${item.score}`);
  }

  if (item.descendants !== undefined) {
    lines.push(`Comments: ${item.descendants}`);
  }

  if (item.text) {
    lines.push(`\nContent:\n${item.text}`);
  }

  if (item.parent) {
    lines.push(`Parent ID: ${item.parent}`);
  }

  if (item.kids && item.kids.length > 0) {
    lines.push(
      `\nChild IDs (${item.kids.length}): ${item.kids.slice(0, 10).join(', ')}${
        item.kids.length > 10 ? '...' : ''
      }`
    );
  }

  if (item.parts && item.parts.length > 0) {
    lines.push(`Poll Options: ${item.parts.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format a user for display
 */
function formatUser(user: HNUser): string {
  const lines: string[] = [];

  lines.push(`Username: ${user.id}`);
  lines.push(`Karma: ${user.karma}`);

  const created = new Date(user.created * 1000);
  lines.push(`Created: ${created.toISOString()}`);

  if (user.about) {
    lines.push(`\nAbout:\n${user.about}`);
  }

  if (user.submitted && user.submitted.length > 0) {
    lines.push(`\nSubmissions (${user.submitted.length} total)`);
    lines.push(
      `Recent IDs: ${user.submitted.slice(0, 20).join(', ')}${
        user.submitted.length > 20 ? '...' : ''
      }`
    );
  }

  return lines.join('\n');
}

metorial.createServer<{}>(
  {
    name: 'hackernews-server',
    version: '1.0.0'
  },
  async server => {
    // Tool: Get top stories
    server.registerTool(
      'get_top_stories',
      {
        title: 'Get Top Stories',
        description: 'Get the list of top story IDs from Hacker News',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(500)
            .optional()
            .describe('Maximum number of story IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/topstories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Top ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://story/{id} resource to get details about each story.`
            }
          ]
        };
      }
    );

    // Tool: Get new stories
    server.registerTool(
      'get_new_stories',
      {
        title: 'Get New Stories',
        description: 'Get the list of newest story IDs from Hacker News',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(500)
            .optional()
            .describe('Maximum number of story IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/newstories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `New ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://story/{id} resource to get details about each story.`
            }
          ]
        };
      }
    );

    // Tool: Get best stories
    server.registerTool(
      'get_best_stories',
      {
        title: 'Get Best Stories',
        description: 'Get the list of best story IDs from Hacker News',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(500)
            .optional()
            .describe('Maximum number of story IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/beststories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Best ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://story/{id} resource to get details about each story.`
            }
          ]
        };
      }
    );

    // Tool: Get Ask HN stories
    server.registerTool(
      'get_ask_stories',
      {
        title: 'Get Ask HN Stories',
        description: 'Get the list of Ask HN story IDs',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(200)
            .optional()
            .describe('Maximum number of story IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/askstories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Ask HN ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://story/{id} resource to get details about each story.`
            }
          ]
        };
      }
    );

    // Tool: Get Show HN stories
    server.registerTool(
      'get_show_stories',
      {
        title: 'Get Show HN Stories',
        description: 'Get the list of Show HN story IDs',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(200)
            .optional()
            .describe('Maximum number of story IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/showstories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Show HN ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://story/{id} resource to get details about each story.`
            }
          ]
        };
      }
    );

    // Tool: Get job stories
    server.registerTool(
      'get_job_stories',
      {
        title: 'Get Job Stories',
        description: 'Get the list of job story IDs from Hacker News',
        inputSchema: {
          limit: z
            .number()
            .min(1)
            .max(200)
            .optional()
            .describe('Maximum number of job IDs to return (default: 30)')
        }
      },
      async ({ limit = 30 }) => {
        const storyIds = await fetchHN<number[]>('/jobstories.json');
        const limitedIds = storyIds.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Job ${limitedIds.length} story IDs:\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://item/{id} resource to get details about each job.`
            }
          ]
        };
      }
    );

    // Tool: Get user submissions
    server.registerTool(
      'get_user_submissions',
      {
        title: 'Get User Submissions',
        description: 'Get all submission IDs for a specific Hacker News user',
        inputSchema: {
          username: z.string().describe('The Hacker News username'),
          limit: z
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of submission IDs to return (default: 30)')
        }
      },
      async ({ username, limit = 30 }) => {
        const user = await fetchHN<HNUser>(`/user/${username}.json`);

        if (!user || !user.submitted) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `User "${username}" not found or has no submissions.`
              }
            ]
          };
        }

        const limitedIds = user.submitted.slice(0, limit);

        return {
          content: [
            {
              type: 'text' as const,
              text: `User "${username}" submissions (${limitedIds.length} of ${
                user.submitted.length
              } total):\n${limitedIds.join(
                '\n'
              )}\n\nUse the hn://item/{id} resource to get details about each submission.`
            }
          ]
        };
      }
    );

    // Tool: Get max item ID
    server.registerTool(
      'get_max_item_id',
      {
        title: 'Get Maximum Item ID',
        description:
          'Get the current maximum item ID from Hacker News (useful for polling for new items)',
        inputSchema: {}
      },
      async () => {
        const maxId = await fetchHN<number>('/maxitem.json');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Current maximum item ID: ${maxId}`
            }
          ]
        };
      }
    );

    // Tool: Get updates
    server.registerTool(
      'get_updates',
      {
        title: 'Get Recent Updates',
        description: 'Get the list of items and profiles that have been recently updated',
        inputSchema: {}
      },
      async () => {
        const updates = await fetchHN<{ items: number[]; profiles: string[] }>(
          '/updates.json'
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `Recent updates:\n\nUpdated Items (${
                updates.items.length
              }):\n${updates.items.slice(0, 20).join('\n')}${
                updates.items.length > 20 ? '\n...' : ''
              }\n\nUpdated Profiles (${updates.profiles.length}):\n${updates.profiles
                .slice(0, 20)
                .join('\n')}${updates.profiles.length > 20 ? '\n...' : ''}`
            }
          ]
        };
      }
    );

    // Resource: Story
    server.registerResource(
      'story',
      new ResourceTemplate('hn://story/{id}', { list: undefined }),
      {
        title: 'Hacker News Story',
        description: 'Get detailed information about a specific Hacker News story'
      },
      async (uri, { id }) => {
        const item = await fetchHN<HNItem>(`/item/${id}.json`);

        if (!item) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Story with ID ${id} not found.`,
                mimeType: 'text/plain'
              }
            ]
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: formatItem(item),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    // Resource: Comment
    server.registerResource(
      'comment',
      new ResourceTemplate('hn://comment/{id}', { list: undefined }),
      {
        title: 'Hacker News Comment',
        description: 'Get detailed information about a specific Hacker News comment'
      },
      async (uri, { id }) => {
        const item = await fetchHN<HNItem>(`/item/${id}.json`);

        if (!item) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Comment with ID ${id} not found.`,
                mimeType: 'text/plain'
              }
            ]
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: formatItem(item),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    // Resource: User
    server.registerResource(
      'user',
      new ResourceTemplate('hn://user/{username}', { list: undefined }),
      {
        title: 'Hacker News User',
        description: 'Get detailed information about a specific Hacker News user'
      },
      async (uri, { username }) => {
        const user = await fetchHN<HNUser>(`/user/${username}.json`);

        if (!user) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `User "${username}" not found.`,
                mimeType: 'text/plain'
              }
            ]
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: formatUser(user),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    // Resource: Item (generic)
    server.registerResource(
      'item',
      new ResourceTemplate('hn://item/{id}', { list: undefined }),
      {
        title: 'Hacker News Item',
        description:
          'Get detailed information about any Hacker News item (story, comment, poll, job, etc.)'
      },
      async (uri, { id }) => {
        const item = await fetchHN<HNItem>(`/item/${id}.json`);

        if (!item) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Item with ID ${id} not found.`,
                mimeType: 'text/plain'
              }
            ]
          };
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: formatItem(item),
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );

    // Resource: Poll
    server.registerResource(
      'poll',
      new ResourceTemplate('hn://poll/{id}', { list: undefined }),
      {
        title: 'Hacker News Poll',
        description:
          'Get detailed information about a Hacker News poll including all poll options'
      },
      async (uri, { id }) => {
        const poll = await fetchHN<HNItem>(`/item/${id}.json`);

        if (!poll) {
          return {
            contents: [
              {
                uri: uri.href,
                text: `Poll with ID ${id} not found.`,
                mimeType: 'text/plain'
              }
            ]
          };
        }

        let text = formatItem(poll);

        // Fetch poll options if available
        if (poll.parts && poll.parts.length > 0) {
          text += '\n\nPoll Options:\n';
          for (const partId of poll.parts) {
            const option = await fetchHN<HNItem>(`/item/${partId}.json`);
            if (option) {
              text += `\n- ${option.text} (Score: ${option.score || 0})`;
            }
          }
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: text,
              mimeType: 'text/plain'
            }
          ]
        };
      }
    );
  }
);
