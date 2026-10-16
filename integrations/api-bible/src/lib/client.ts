import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export interface ScriptureMeta {
  fumsId?: string;
  fumsToken?: string;
  [key: string]: unknown;
}

export interface BibleSummary {
  id: string;
  name: string;
  nameLocal: string;
  abbreviation: string;
  abbreviationLocal: string;
  description: string;
  descriptionLocal: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptDirection: string;
  };
  countries: Array<{
    id: string;
    name: string;
    nameLocal: string;
  }>;
  type: string;
  updatedAt: string;
  copyright?: string;
  info?: string;
  audioBibles?: Array<{
    id: string;
    name: string;
    nameLocal: string;
  }>;
}

export type Bible = BibleSummary;

export interface Book {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

export interface ChapterContent extends Chapter {
  content: string | Record<string, unknown>[];
  verseCount: number;
  copyright: string;
  next: { id: string; bookId: string; number: string } | null;
  previous: { id: string; bookId: string; number: string } | null;
}

export interface Verse {
  id: string;
  orgId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

export interface VerseContent extends Verse {
  content: string | Record<string, unknown>[];
  copyright: string;
  next: { id: string; bookId: string } | null;
  previous: { id: string; bookId: string } | null;
}

export interface PassageContent {
  id: string;
  bibleId: string;
  orgId: string;
  content: string | Record<string, unknown>[];
  reference: string;
  verseCount: number;
  copyright: string;
}

export interface Section {
  id: string;
  bibleId: string;
  bookId: string;
  chapterId?: string;
  title: string;
  firstVerseId: string;
  lastVerseId: string;
  firstVerseOrgId: string;
  lastVerseOrgId: string;
}

export interface SectionContent extends Section {
  content: string | Record<string, unknown>[];
  copyright: string;
}

export interface SearchResult {
  query: string;
  limit: number;
  offset: number;
  total: number;
  verseCount: number;
  verses: Array<{
    id: string;
    orgId: string;
    bibleId: string;
    bookId: string;
    chapterId: string;
    reference: string;
    text: string;
  }>;
  passages?: Array<{
    id: string;
    bibleId: string;
    orgId: string;
    content: string | Record<string, unknown>[];
    reference: string;
    verseCount: number;
    copyright: string;
  }>;
}

export interface AudioBibleSummary {
  copyright?: string;
  info?: string;
  id: string;
  name: string;
  nameLocal: string;
  description: string;
  descriptionLocal: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptDirection: string;
  };
  countries: Array<{
    id: string;
    name: string;
    nameLocal: string;
  }>;
  type: string;
  updatedAt: string;
}

export interface AudioBible extends AudioBibleSummary {
  copyright?: string;
  info?: string;
}

export interface AudioChapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
  resourceUrl: string;
  expiresAt: number;
  timecodes?: Array<{ start: string; end: string; verseId: string }>;
  copyright?: string;
  next: { id: string; bookId: string; number: string } | null;
  previous: { id: string; bookId: string; number: string } | null;
}

export interface ListBiblesParams {
  language?: string;
  abbreviation?: string;
  name?: string;
  ids?: string;
  includeFullDetails?: boolean;
}

export interface ContentParams {
  contentType?: 'html' | 'json' | 'text';
  includeNotes?: boolean;
  includeTitles?: boolean;
  includeChapterNumbers?: boolean;
  includeVerseNumbers?: boolean;
  includeVerseSpans?: boolean;
  parallels?: string;
  useOrgId?: boolean;
}

export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'canonical' | 'reverse-canonical';
  range?: string;
  fuzziness?: 'AUTO' | '0' | '1' | '2';
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://rest.api.bible/v1',
      authHeader: { name: 'api-key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'API.Bible',
          reason: 'api_bible_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  // --- Bibles ---

  async listBibles(params?: ListBiblesParams): Promise<{ data: BibleSummary[] }> {
    let response = await this.http.get('/bibles', {
      params: {
        language: params?.language,
        abbreviation: params?.abbreviation,
        name: params?.name,
        ids: params?.ids,
        'include-full-details': params?.includeFullDetails
      }
    });
    return response.data;
  }

  async getBible(bibleId: string): Promise<{ data: Bible }> {
    let response = await this.http.get(`/bibles/${encodeURIComponent(bibleId)}`);
    return response.data;
  }

  // --- Books ---

  async getBooks(
    bibleId: string,
    includeChapters?: boolean,
    includeChaptersAndSections?: boolean
  ): Promise<{ data: Book[] }> {
    let response = await this.http.get(`/bibles/${encodeURIComponent(bibleId)}/books`, {
      params: {
        'include-chapters': includeChapters,
        'include-chapters-and-sections': includeChaptersAndSections
      }
    });
    return response.data;
  }

  async getBook(
    bibleId: string,
    bookId: string,
    includeChapters?: boolean
  ): Promise<{ data: Book }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}`,
      {
        params: {
          'include-chapters': includeChapters
        }
      }
    );
    return response.data;
  }

  // --- Chapters ---

  async getChapters(bibleId: string, bookId: string): Promise<{ data: Chapter[] }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/chapters`
    );
    return response.data;
  }

  async getChapter(
    bibleId: string,
    chapterId: string,
    params?: ContentParams
  ): Promise<{ data: ChapterContent; meta: ScriptureMeta }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}`,
      {
        params: {
          'content-type': params?.contentType,
          'include-notes': params?.includeNotes,
          'include-titles': params?.includeTitles,
          'include-chapter-numbers': params?.includeChapterNumbers,
          'include-verse-numbers': params?.includeVerseNumbers,
          'include-verse-spans': params?.includeVerseSpans,
          parallels: params?.parallels
        }
      }
    );
    return response.data;
  }

  // --- Verses ---

  async getVerses(bibleId: string, chapterId: string): Promise<{ data: Verse[] }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}/verses`
    );
    return response.data;
  }

  async getVerse(
    bibleId: string,
    verseId: string,
    params?: ContentParams
  ): Promise<{ data: VerseContent; meta: ScriptureMeta }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/verses/${encodeURIComponent(verseId)}`,
      {
        params: {
          'content-type': params?.contentType,
          'include-notes': params?.includeNotes,
          'include-titles': params?.includeTitles,
          'include-chapter-numbers': params?.includeChapterNumbers,
          'include-verse-numbers': params?.includeVerseNumbers,
          'include-verse-spans': params?.includeVerseSpans,
          parallels: params?.parallels,
          'use-org-id': params?.useOrgId
        }
      }
    );
    return response.data;
  }

  // --- Passages ---

  async getPassage(
    bibleId: string,
    passageId: string,
    params?: ContentParams
  ): Promise<{ data: PassageContent; meta: ScriptureMeta }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(passageId)}`,
      {
        params: {
          'content-type': params?.contentType,
          'include-notes': params?.includeNotes,
          'include-titles': params?.includeTitles,
          'include-chapter-numbers': params?.includeChapterNumbers,
          'include-verse-numbers': params?.includeVerseNumbers,
          'include-verse-spans': params?.includeVerseSpans,
          parallels: params?.parallels,
          'use-org-id': params?.useOrgId
        }
      }
    );
    return response.data;
  }

  // --- Sections ---

  async getSections(bibleId: string, bookId: string): Promise<{ data: Section[] }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/books/${encodeURIComponent(bookId)}/sections`
    );
    return response.data;
  }

  async getChapterSections(bibleId: string, chapterId: string): Promise<{ data: Section[] }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}/sections`
    );
    return response.data;
  }

  async getSection(
    bibleId: string,
    sectionId: string,
    params?: ContentParams
  ): Promise<{ data: SectionContent; meta: ScriptureMeta }> {
    let response = await this.http.get(
      `/bibles/${encodeURIComponent(bibleId)}/sections/${encodeURIComponent(sectionId)}`,
      {
        params: {
          'content-type': params?.contentType,
          'include-notes': params?.includeNotes,
          'include-titles': params?.includeTitles,
          'include-chapter-numbers': params?.includeChapterNumbers,
          'include-verse-numbers': params?.includeVerseNumbers,
          'include-verse-spans': params?.includeVerseSpans,
          parallels: params?.parallels
        }
      }
    );
    return response.data;
  }

  // --- Search ---

  async search(
    bibleId: string,
    params: SearchParams
  ): Promise<{ data: SearchResult; meta?: ScriptureMeta }> {
    let response = await this.http.get(`/bibles/${encodeURIComponent(bibleId)}/search`, {
      params: {
        query: params.query,
        limit: params.limit,
        offset: params.offset,
        sort: params.sort,
        range: params.range,
        fuzziness: params.fuzziness
      }
    });
    return response.data;
  }

  // --- Audio Bibles ---

  async listAudioBibles(params?: {
    language?: string;
    abbreviation?: string;
    name?: string;
    ids?: string;
    bibleId?: string;
    includeFullDetails?: boolean;
  }): Promise<{ data: AudioBibleSummary[] }> {
    let response = await this.http.get('/audio-bibles', {
      params: {
        language: params?.language,
        abbreviation: params?.abbreviation,
        name: params?.name,
        ids: params?.ids,
        bibleId: params?.bibleId,
        'include-full-details': params?.includeFullDetails
      }
    });
    return response.data;
  }

  async getAudioBible(audioBibleId: string): Promise<{ data: AudioBible }> {
    let response = await this.http.get(`/audio-bibles/${encodeURIComponent(audioBibleId)}`);
    return response.data;
  }

  async getAudioBibleBooks(
    audioBibleId: string,
    includeChapters?: boolean
  ): Promise<{ data: Book[] }> {
    let response = await this.http.get(
      `/audio-bibles/${encodeURIComponent(audioBibleId)}/books`,
      {
        params: {
          'include-chapters': includeChapters
        }
      }
    );
    return response.data;
  }

  async getAudioBibleChapters(
    audioBibleId: string,
    bookId: string
  ): Promise<{ data: Chapter[] }> {
    let response = await this.http.get(
      `/audio-bibles/${encodeURIComponent(audioBibleId)}/books/${encodeURIComponent(bookId)}/chapters`
    );
    return response.data;
  }

  async getAudioChapter(
    audioBibleId: string,
    chapterId: string
  ): Promise<{ data: AudioChapter; meta: ScriptureMeta }> {
    let response = await this.http.get(
      `/audio-bibles/${encodeURIComponent(audioBibleId)}/chapters/${encodeURIComponent(chapterId)}`
    );
    return response.data;
  }
}
