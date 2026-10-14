import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ChatFaiCharacter {
  id: string;
  name: string;
  bio: string;
  genre: string;
  imageUrl?: string;
  greeting?: string;
  [key: string]: unknown;
}

export interface ChatFaiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatFaiChatRequest {
  characterId: string;
  conversation: ChatFaiMessage[];
  name?: string;
  bio?: string;
  useInternalOptimizations?: boolean;
}

export interface ChatFaiChatResponse {
  reply: string;
  [key: string]: unknown;
}

export interface SearchCharactersResponse {
  characters: ChatFaiCharacter[];
  [key: string]: unknown;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A ChatFAI API key is required. Reconnect with a valid key.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.chatfai.com/v1/',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'ChatFAI',
          reason: 'chatfai_request_failed',
          operation: 'request'
        })
    });
  }

  async searchCharacters(query: string): Promise<ChatFaiCharacter[]> {
    if (!query.trim()) {
      throw createApiServiceError('Enter a non-empty character search query.');
    }

    let response = await this.axios.get('/search', {
      params: { query }
    });
    let characters = response.data?.characters ?? response.data;
    if (!Array.isArray(characters)) {
      throw createApiServiceError('ChatFAI returned an unexpected character search response.');
    }
    return characters.map(character => this.parseCharacter(character));
  }

  async getCharacter(characterId: string): Promise<ChatFaiCharacter> {
    if (!characterId.trim()) {
      throw createApiServiceError(
        'A character ID is required. Use search_characters to find one.'
      );
    }

    let response = await this.axios.get(`/characters/${encodeURIComponent(characterId)}`);
    return this.parseCharacter(response.data?.character ?? response.data);
  }

  async sendMessage(request: ChatFaiChatRequest): Promise<ChatFaiChatResponse> {
    if (!request.characterId.trim()) {
      throw createApiServiceError(
        'A character ID is required. Use search_characters to find one.'
      );
    }

    let response = await this.axios.post('/chat', {
      character_id: request.characterId,
      conversation: request.conversation.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      ...(request.name !== undefined && { name: request.name }),
      ...(request.bio !== undefined && { bio: request.bio }),
      ...(request.useInternalOptimizations !== undefined && {
        use_internal_optimizations: request.useInternalOptimizations
      })
    });
    if (
      !response.data ||
      typeof response.data !== 'object' ||
      typeof response.data.reply !== 'string'
    ) {
      throw createApiServiceError('ChatFAI returned an unexpected message reply response.');
    }
    return response.data;
  }

  private parseCharacter(value: unknown): ChatFaiCharacter {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw createApiServiceError('ChatFAI returned an unexpected character response.');
    }

    let character = value as Record<string, unknown>;
    if (
      typeof character.id !== 'string' ||
      !character.id.trim() ||
      typeof character.name !== 'string' ||
      (character.bio != null && typeof character.bio !== 'string') ||
      (character.genre != null && typeof character.genre !== 'string') ||
      (character.imageUrl != null && typeof character.imageUrl !== 'string') ||
      (character.greeting != null && typeof character.greeting !== 'string')
    ) {
      throw createApiServiceError('ChatFAI returned invalid character details.');
    }

    return {
      ...character,
      id: character.id,
      name: character.name,
      bio: typeof character.bio === 'string' ? character.bio : '',
      genre: typeof character.genre === 'string' ? character.genre : '',
      imageUrl: typeof character.imageUrl === 'string' ? character.imageUrl : undefined,
      greeting: typeof character.greeting === 'string' ? character.greeting : undefined
    };
  }
}
