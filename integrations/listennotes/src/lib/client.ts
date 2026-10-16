import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  CuratedListFull,
  CuratedListSimple,
  EpisodeFull,
  EpisodeSimple,
  Genre,
  PlaylistResponse,
  PlaylistSummary,
  PlaylistsResponse,
  PodcastFull,
  PodcastSimple,
  SearchResponse,
  TypeaheadResponse
} from './types';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('Enter a Listen Notes API key from your API Dashboard.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      authHeader: { name: 'X-ListenAPI-Key', value: config.token },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Listen Notes',
          reason: 'listennotes_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  // ── Search API ──

  async search(params: {
    q: string;
    type?: 'episode' | 'podcast' | 'curated';
    sortByDate?: number;
    offset?: number;
    lenMin?: number;
    lenMax?: number;
    episodeCountMin?: number;
    episodeCountMax?: number;
    updateFreqMin?: number;
    updateFreqMax?: number;
    genreIds?: string;
    publishedBefore?: number;
    publishedAfter?: number;
    onlyIn?: string;
    language?: string;
    region?: string;
    ocid?: string;
    ncid?: string;
    safeMode?: number;
    uniquePodcasts?: number;
    pageSize?: number;
    interviewsOnly?: number;
    sponsoredOnly?: number;
  }): Promise<SearchResponse> {
    let response = await this.axios.get('/search', {
      params: {
        q: params.q,
        type: params.type,
        sort_by_date: params.sortByDate,
        offset: params.offset,
        len_min: params.lenMin,
        len_max: params.lenMax,
        episode_count_min: params.episodeCountMin,
        episode_count_max: params.episodeCountMax,
        update_freq_min: params.updateFreqMin,
        update_freq_max: params.updateFreqMax,
        genre_ids: params.genreIds,
        published_before: params.publishedBefore,
        published_after: params.publishedAfter,
        only_in: params.onlyIn,
        language: params.language,
        region: params.region,
        ocid: params.ocid,
        ncid: params.ncid,
        safe_mode: params.safeMode,
        unique_podcasts: params.uniquePodcasts,
        interviews_only: params.interviewsOnly,
        sponsored_only: params.sponsoredOnly,
        page_size: params.pageSize
      }
    });
    return response.data;
  }

  async searchEpisodeTitles(params: {
    q: string;
    podcastId?: string;
    podcastIdType?: 'listennotes_id' | 'itunes_id' | 'spotify_id' | 'rss';
  }): Promise<SearchResponse> {
    let response = await this.axios.get('/search_episode_titles', {
      params: {
        q: params.q,
        podcast_id: params.podcastId,
        podcast_id_type: params.podcastIdType
      }
    });
    return response.data;
  }

  async typeahead(params: {
    q: string;
    showPodcasts?: number;
    showGenres?: number;
    safeMode?: number;
  }): Promise<TypeaheadResponse> {
    let response = await this.axios.get('/typeahead', {
      params: {
        q: params.q,
        show_podcasts: params.showPodcasts,
        show_genres: params.showGenres,
        safe_mode: params.safeMode
      }
    });
    return response.data;
  }

  async getTrendingSearches(): Promise<{ terms: string[] }> {
    let response = await this.axios.get('/trending_searches');
    return response.data;
  }

  async getRelatedSearches(q: string): Promise<{ terms: string[] }> {
    let response = await this.axios.get('/related_searches', {
      params: { q }
    });
    return response.data;
  }

  async spellcheck(q: string): Promise<{
    tokens: { offset: number; token: string; suggestion: string }[];
    corrected_text_html: string;
  }> {
    let response = await this.axios.get('/spellcheck', {
      params: { q }
    });
    return response.data;
  }

  // ── Directory API ──

  async getPodcast(params: {
    podcastId: string;
    nextEpisodePubDate?: number;
    sort?: 'recent_first' | 'oldest_first';
  }): Promise<PodcastFull> {
    let response = await this.axios.get(`/podcasts/${encodeURIComponent(params.podcastId)}`, {
      params: {
        next_episode_pub_date: params.nextEpisodePubDate,
        sort: params.sort
      }
    });
    return response.data;
  }

  async getEpisode(params: {
    episodeId: string;
    showTranscript?: number;
  }): Promise<EpisodeFull> {
    let response = await this.axios.get(`/episodes/${encodeURIComponent(params.episodeId)}`, {
      params: {
        show_transcript: params.showTranscript
      }
    });
    return response.data;
  }

  async batchFetchPodcasts(params: {
    ids?: string;
    rsses?: string;
    itunesIds?: string;
    spotifyIds?: string;
    showLatestEpisodes?: number;
    nextEpisodePubDate?: number;
  }): Promise<{ podcasts: PodcastSimple[]; latest_episodes?: EpisodeSimple[] }> {
    let response = await this.axios.post(
      '/podcasts',
      new URLSearchParams(
        Object.entries(
          pickDefined({
            ids: params.ids,
            rsses: params.rsses,
            itunes_ids: params.itunesIds,
            spotify_ids: params.spotifyIds,
            show_latest_episodes: params.showLatestEpisodes,
            next_episode_pub_date: params.nextEpisodePubDate
          })
        ).map(([key, value]): [string, string] => [key, String(value)])
      ),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  }

  async batchFetchEpisodes(ids: string): Promise<{ episodes: EpisodeSimple[] }> {
    let response = await this.axios.post('/episodes', new URLSearchParams({ ids }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getBestPodcasts(params: {
    genreId?: string;
    page?: number;
    region?: string;
    publisherRegion?: string;
    language?: string;
    sort?:
      | 'recent_added_first'
      | 'oldest_added_first'
      | 'recent_published_first'
      | 'oldest_published_first'
      | 'listen_score';
    safeMode?: number;
  }): Promise<{
    has_previous: boolean;
    name: string;
    listennotes_url: string;
    previous_page_number: number;
    page_number: number;
    has_next: boolean;
    next_page_number: number;
    parent_id: number;
    id: number;
    total: number;
    podcasts: PodcastSimple[];
  }> {
    let response = await this.axios.get('/best_podcasts', {
      params: {
        genre_id: params.genreId,
        page: params.page,
        region: params.region,
        publisher_region: params.publisherRegion,
        language: params.language,
        sort: params.sort,
        safe_mode: params.safeMode
      }
    });
    return response.data;
  }

  async getPodcastRecommendations(params: {
    podcastId: string;
    safeMode?: number;
  }): Promise<{ recommendations: PodcastSimple[] }> {
    let response = await this.axios.get(
      `/podcasts/${encodeURIComponent(params.podcastId)}/recommendations`,
      {
        params: { safe_mode: params.safeMode }
      }
    );
    return response.data;
  }

  async getEpisodeRecommendations(params: {
    episodeId: string;
    safeMode?: number;
  }): Promise<{ recommendations: EpisodeSimple[] }> {
    let response = await this.axios.get(
      `/episodes/${encodeURIComponent(params.episodeId)}/recommendations`,
      {
        params: { safe_mode: params.safeMode }
      }
    );
    return response.data;
  }

  async getCuratedPodcasts(params: { page?: number }): Promise<{
    curated_lists: CuratedListSimple[];
    page_number: number;
    has_next: boolean;
    next_page_number: number;
    previous_page_number: number;
    has_previous: boolean;
    total: number;
  }> {
    let response = await this.axios.get('/curated_podcasts', {
      params: { page: params.page }
    });
    return response.data;
  }

  async getCuratedPodcast(curatedListId: string): Promise<CuratedListFull> {
    let response = await this.axios.get(
      `/curated_podcasts/${encodeURIComponent(curatedListId)}`
    );
    return response.data;
  }

  async justListen(): Promise<EpisodeSimple> {
    let response = await this.axios.get('/just_listen');
    return response.data;
  }

  // ── Genres, Languages, Regions ──

  async getGenres(topLevelOnly?: number): Promise<{ genres: Genre[] }> {
    let response = await this.axios.get('/genres', {
      params: { top_level_only: topLevelOnly }
    });
    return response.data;
  }

  async getLanguages(): Promise<{ languages: string[] }> {
    let response = await this.axios.get('/languages');
    return response.data;
  }

  async getRegions(): Promise<{ regions: Record<string, string> }> {
    let response = await this.axios.get('/regions');
    return response.data;
  }

  // ── Playlist API ──

  async getPlaylists(params: {
    sort?: 'recent_added_first' | 'oldest_added_first' | 'name_a_to_z' | 'name_z_to_a';
    page?: number;
  }): Promise<PlaylistsResponse> {
    let response = await this.axios.get('/playlists', {
      params: {
        sort: params.sort,
        page: params.page
      }
    });
    return response.data;
  }

  async getPlaylist(params: {
    playlistId: string;
    type?: 'episode_list' | 'podcast_list';
    lastTimestampMs?: number;
    sort?:
      | 'recent_added_first'
      | 'oldest_added_first'
      | 'recent_published_first'
      | 'oldest_published_first';
  }): Promise<PlaylistResponse> {
    let response = await this.axios.get(
      `/playlists/${encodeURIComponent(params.playlistId)}`,
      {
        params: {
          type: params.type,
          last_timestamp_ms: params.lastTimestampMs,
          sort: params.sort
        }
      }
    );
    return response.data;
  }

  // ── Podcaster API ──

  async submitPodcast(params: { rss: string; email?: string }): Promise<{
    status: string;
    podcast: any;
  }> {
    let response = await this.axios.post(
      '/podcasts/submit',
      new URLSearchParams(
        Object.entries(pickDefined({ rss: params.rss, email: params.email })).map(
          ([key, value]): [string, string] => [key, String(value)]
        )
      ),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  }

  async deletePodcast(params: { podcastId: string; reason?: string }): Promise<{
    status: string;
  }> {
    let response = await this.axios.delete(
      `/podcasts/${encodeURIComponent(params.podcastId)}`,
      {
        params: { reason: params.reason }
      }
    );
    return response.data;
  }

  async createPlaylist(params: {
    name: string;
    description?: string;
    visibility?: string;
    type?: string;
  }): Promise<PlaylistSummary> {
    let response = await this.axios.post('/playlists', pickDefined(params));
    return response.data;
  }

  async updatePlaylist(
    playlistId: string,
    params: { name?: string; description?: string; visibility?: string; type?: string }
  ): Promise<PlaylistSummary> {
    let response = await this.axios.put(
      `/playlists/${encodeURIComponent(playlistId)}`,
      pickDefined(params)
    );
    return response.data;
  }

  async deletePlaylist(playlistId: string): Promise<{ id: string; deleted: boolean }> {
    let response = await this.axios.delete(`/playlists/${encodeURIComponent(playlistId)}`);
    return response.data;
  }

  async addPlaylistItem(
    playlistId: string,
    params: { episode_id?: string; podcast_id?: string; notes?: string }
  ): Promise<PlaylistResponse['items'][number]> {
    let response = await this.axios.post(
      `/playlists/${encodeURIComponent(playlistId)}/items`,
      pickDefined(params)
    );
    return response.data;
  }

  async updatePlaylistItem(
    playlistId: string,
    itemId: number,
    notes: string
  ): Promise<PlaylistResponse['items'][number]> {
    let response = await this.axios.put(
      `/playlists/${encodeURIComponent(playlistId)}/items/${itemId}`,
      { notes }
    );
    return response.data;
  }

  async removePlaylistItem(
    playlistId: string,
    itemId: number
  ): Promise<{ id: number; deleted: boolean }> {
    let response = await this.axios.delete(
      `/playlists/${encodeURIComponent(playlistId)}/items/${itemId}`
    );
    return response.data;
  }

  // ── Insights API ──

  async getPodcastAudience(podcastId: string): Promise<any> {
    let response = await this.axios.get(`/podcasts/${encodeURIComponent(podcastId)}/audience`);
    return response.data;
  }

  async getPodcastsByDomain(params: { domainName: string; page?: number }): Promise<{
    has_previous: boolean;
    previous_page_number: number;
    page_number: number;
    has_next: boolean;
    next_page_number: number;
    podcasts: PodcastSimple[];
  }> {
    let response = await this.axios.get(
      `/podcasts/domains/${encodeURIComponent(params.domainName)}`,
      {
        params: { page: params.page }
      }
    );
    return response.data;
  }
}
