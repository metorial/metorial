import { createAxios } from 'slates';

export interface BibleSummary {
  bibleId: string;
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
  audioBibles: Array<{
    audioBibleId: string;
    name: string;
    nameLocal: string;
  }>;
}

export interface Bible extends BibleSummary {
  copyright: string;
  info: string;
}

export interface Book {
  bookId: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

export interface Chapter {
  chapterId: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

export interface ChapterContent extends Chapter {
  content: string;
  verseCount: number;
  copyright: string;
  next: { chapterId: string; bookId: string; number: string } | null;
  previous: { chapterId: string; bookId: string; number: string } | null;
}

export interface Verse {
  verseId: string;
  orgId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

export interface VerseContent extends Verse {
  content: string;
  copyright: string;
  next: { verseId: string; bookId: string } | null;
  previous: { verseId: string; bookId: string } | null;
}

export interface PassageContent {
  passageId: string;
  bibleId: string;
  orgId: string;
  content: string;
  reference: string;
  verseCount: number;
  copyright: string;
}

export interface Section {
  sectionId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  title: string;
}

export interface SectionContent extends Section {
  content: string;
  copyright: string;
}

export interface SearchResult {
  query: string;
  limit: number;
  offset: number;
  total: number;
  verseCount: number;
  verses: Array<{
    verseId: string;
    orgId: string;
    bibleId: string;
    bookId: string;
    chapterId: string;
    reference: string;
    text: string;
  }>;
  passages: Array<{
    passageId: string;
    bibleId: string;
    orgId: string;
    content: string;
    reference: string;
    verseCount: number;
  }>;
}

export interface AudioBibleSummary {
  audioBibleId: string;
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
  copyright: string;
  info: string;
}

export interface AudioChapter {
  chapterId: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
  resourceUrl: string;
  copyright: string;
  next: { chapterId: string; bookId: string; number: string } | null;
  previous: { chapterId: string; bookId: string; number: string } | null;
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
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.scripture.api.bible/v1',
      headers: {
        'api-key': config.token
      }
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
    let response = await this.http.get(`/bibles/${bibleId}`);
    return response.data;
  }

  // --- Books ---

  async getBooks(
    bibleId: string,
    includeChapters?: boolean,
    includeChaptersAndSections?: boolean
  ): Promise<{ data: Book[] }> {
    let response = await this.http.get(`/bibles/${bibleId}/books`, {
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
    let response = await this.http.get(`/bibles/${bibleId}/books/${bookId}`, {
      params: {
        'include-chapters': includeChapters
      }
    });
    return response.data;
  }

  // --- Chapters ---

  async getChapters(bibleId: string, bookId: string): Promise<{ data: Chapter[] }> {
    let response = await this.http.get(`/bibles/${bibleId}/books/${bookId}/chapters`);
    return response.data;
  }

  async getChapter(
    bibleId: string,
    chapterId: string,
    params?: ContentParams
  ): Promise<{ data: ChapterContent; meta: { fumsId: string } }> {
    let response = await this.http.get(`/bibles/${bibleId}/chapters/${chapterId}`, {
      params: {
        'content-type': params?.contentType,
        'include-notes': params?.includeNotes,
        'include-titles': params?.includeTitles,
        'include-chapter-numbers': params?.includeChapterNumbers,
        'include-verse-numbers': params?.includeVerseNumbers,
        'include-verse-spans': params?.includeVerseSpans,
        parallels: params?.parallels
      }
    });
    return response.data;
  }

  // --- Verses ---

  async getVerses(bibleId: string, chapterId: string): Promise<{ data: Verse[] }> {
    let response = await this.http.get(`/bibles/${bibleId}/chapters/${chapterId}/verses`);
    return response.data;
  }

  async getVerse(
    bibleId: string,
    verseId: string,
    params?: ContentParams
  ): Promise<{ data: VerseContent; meta: { fumsId: string } }> {
    let response = await this.http.get(`/bibles/${bibleId}/verses/${verseId}`, {
      params: {
        'content-type': params?.contentType,
        'include-notes': params?.includeNotes,
        'include-titles': params?.includeTitles,
        'include-chapter-numbers': params?.includeChapterNumbers,
        'include-verse-numbers': params?.includeVerseNumbers,
        'include-verse-spans': params?.includeVerseSpans,
        parallels: params?.parallels
      }
    });
    return response.data;
  }

  // --- Passages ---

  async getPassage(
    bibleId: string,
    passageId: string,
    params?: ContentParams
  ): Promise<{ data: PassageContent; meta: { fumsId: string } }> {
    let response = await this.http.get(`/bibles/${bibleId}/passages/${passageId}`, {
      params: {
        'content-type': params?.contentType,
        'include-notes': params?.includeNotes,
        'include-titles': params?.includeTitles,
        'include-chapter-numbers': params?.includeChapterNumbers,
        'include-verse-numbers': params?.includeVerseNumbers,
        'include-verse-spans': params?.includeVerseSpans,
        parallels: params?.parallels
      }
    });
    return response.data;
  }

  // --- Sections ---

  async getSections(bibleId: string, bookId: string): Promise<{ data: Section[] }> {
    let response = await this.http.get(`/bibles/${bibleId}/books/${bookId}/sections`);
    return response.data;
  }

  async getChapterSections(bibleId: string, chapterId: string): Promise<{ data: Section[] }> {
    let response = await this.http.get(`/bibles/${bibleId}/chapters/${chapterId}/sections`);
    return response.data;
  }

  async getSection(
    bibleId: string,
    sectionId: string,
    params?: ContentParams
  ): Promise<{ data: SectionContent; meta: { fumsId: string } }> {
    let response = await this.http.get(`/bibles/${bibleId}/sections/${sectionId}`, {
      params: {
        'content-type': params?.contentType,
        'include-notes': params?.includeNotes,
        'include-titles': params?.includeTitles,
        'include-chapter-numbers': params?.includeChapterNumbers,
        'include-verse-numbers': params?.includeVerseNumbers,
        'include-verse-spans': params?.includeVerseSpans,
        parallels: params?.parallels
      }
    });
    return response.data;
  }

  // --- Search ---

  async search(bibleId: string, params: SearchParams): Promise<{ data: SearchResult }> {
    let response = await this.http.get(`/bibles/${bibleId}/search`, {
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
    includeFullDetails?: boolean;
  }): Promise<{ data: AudioBibleSummary[] }> {
    let response = await this.http.get('/audio-bibles', {
      params: {
        language: params?.language,
        'include-full-details': params?.includeFullDetails
      }
    });
    return response.data;
  }

  async getAudioBible(audioBibleId: string): Promise<{ data: AudioBible }> {
    let response = await this.http.get(`/audio-bibles/${audioBibleId}`);
    return response.data;
  }

  async getAudioBibleBooks(
    audioBibleId: string,
    includeChapters?: boolean
  ): Promise<{ data: Book[] }> {
    let response = await this.http.get(`/audio-bibles/${audioBibleId}/books`, {
      params: {
        'include-chapters': includeChapters
      }
    });
    return response.data;
  }

  async getAudioBibleChapters(
    audioBibleId: string,
    bookId: string
  ): Promise<{ data: Chapter[] }> {
    let response = await this.http.get(
      `/audio-bibles/${audioBibleId}/books/${bookId}/chapters`
    );
    return response.data;
  }

  async getAudioChapter(
    audioBibleId: string,
    chapterId: string
  ): Promise<{ data: AudioChapter; meta: { fumsId: string } }> {
    let response = await this.http.get(`/audio-bibles/${audioBibleId}/chapters/${chapterId}`);
    return response.data;
  }
}
