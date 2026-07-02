import { createAxios } from 'slates';
import type { CharacterGrid } from './client';

export interface VbmlComponent {
  template?: string;
  rawCharacters?: CharacterGrid;
  style?: {
    height?: number;
    width?: number;
    justify?: 'left' | 'right' | 'center' | 'justified';
    align?: 'top' | 'bottom' | 'center' | 'justified';
    absolutePosition?: { x: number; y: number };
  };
}

export interface VbmlComposeRequest {
  props?: Record<string, string>;
  style?: {
    height?: number;
    width?: number;
  };
  components: VbmlComponent[];
}

export class VbmlClient {
  private http;

  constructor() {
    this.http = createAxios({
      baseURL: 'https://vbml.vestaboard.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async compose(request: VbmlComposeRequest): Promise<CharacterGrid> {
    let response = await this.http.post('/compose', request);
    return response.data;
  }

  async format(message: string): Promise<CharacterGrid> {
    let response = await this.http.post('/format', { message });
    return response.data;
  }
}
