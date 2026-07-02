import { createAxios } from 'slates';

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
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.chatfai.com/v1/',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async searchCharacters(query: string): Promise<ChatFaiCharacter[]> {
    let response = await this.axios.get('/search', {
      params: { query }
    });
    return response.data.characters ?? response.data;
  }

  async getCharacter(characterId: string): Promise<ChatFaiCharacter> {
    let response = await this.axios.get(`/characters/${characterId}`);
    return response.data.character ?? response.data;
  }

  async sendMessage(request: ChatFaiChatRequest): Promise<ChatFaiChatResponse> {
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
    return response.data;
  }
}
