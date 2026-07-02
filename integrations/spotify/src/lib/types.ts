export type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

export type SpotifyExternalUrls = {
  spotify: string;
};

export type SpotifyFollowers = {
  href: string | null;
  total: number;
};

export type SimplifiedArtist = {
  id: string;
  name: string;
  type: string;
  uri: string;
  external_urls: SpotifyExternalUrls;
};

export type SpotifyArtist = SimplifiedArtist & {
  followers: SpotifyFollowers;
  genres: string[];
  images: SpotifyImage[];
  popularity: number;
};

export type SimplifiedAlbum = {
  id: string;
  name: string;
  album_type: string;
  total_tracks: number;
  release_date: string;
  release_date_precision: string;
  images: SpotifyImage[];
  artists: SimplifiedArtist[];
  external_urls: SpotifyExternalUrls;
  uri: string;
  type: string;
};

export type SpotifyAlbum = SimplifiedAlbum & {
  tracks: SpotifyPaginated<SimplifiedTrack>;
  genres: string[];
  label: string;
  popularity: number;
  copyrights: Array<{ text: string; type: string }>;
};

export type SimplifiedTrack = {
  id: string;
  name: string;
  track_number: number;
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  artists: SimplifiedArtist[];
  external_urls: SpotifyExternalUrls;
  uri: string;
  type: string;
  preview_url: string | null;
  is_local: boolean;
};

export type SpotifyTrack = SimplifiedTrack & {
  album: SimplifiedAlbum;
  popularity: number;
  external_ids: Record<string, string>;
};

export type SpotifyPaginated<T> = {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
};

export type SpotifyCursorPaginated<T> = {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  cursors: {
    after: string | null;
    before?: string | null;
  };
  total?: number;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: SpotifyUser;
  images: SpotifyImage[];
  tracks: SpotifyPaginated<SpotifyPlaylistTrack>;
  external_urls: SpotifyExternalUrls;
  uri: string;
  snapshot_id: string;
  followers: SpotifyFollowers;
  type: string;
};

export type SimplifiedPlaylist = {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: SpotifyUser;
  images: SpotifyImage[];
  tracks: { href: string; total: number };
  external_urls: SpotifyExternalUrls;
  uri: string;
  snapshot_id: string;
  type: string;
};

export type SpotifyPlaylistTrack = {
  added_at: string;
  added_by: SpotifyUser;
  is_local: boolean;
  track: SpotifyTrack | null;
};

export type SpotifyUser = {
  id: string;
  display_name: string | null;
  external_urls: SpotifyExternalUrls;
  uri: string;
  type: string;
  followers?: SpotifyFollowers;
  images?: SpotifyImage[];
  email?: string;
  product?: string;
  country?: string;
};

export type SpotifyDevice = {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
};

export type SpotifyPlaybackState = {
  device: SpotifyDevice;
  repeat_state: string;
  shuffle_state: boolean;
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  item: SpotifyTrack | null;
  currently_playing_type: string;
  context: {
    type: string;
    uri: string;
    external_urls: SpotifyExternalUrls;
    href: string;
  } | null;
};

export type SpotifyQueue = {
  currently_playing: SpotifyTrack | null;
  queue: SpotifyTrack[];
};

export type PlayHistoryItem = {
  track: SpotifyTrack;
  played_at: string;
  context: {
    type: string;
    uri: string;
    external_urls: SpotifyExternalUrls;
    href: string;
  } | null;
};

export type SpotifySavedTrack = {
  added_at: string;
  track: SpotifyTrack;
};

export type SpotifySavedAlbum = {
  added_at: string;
  album: SpotifyAlbum;
};

export type SpotifySavedShow = {
  added_at: string;
  show: {
    id: string;
    name: string;
    description: string;
    publisher: string;
    images: SpotifyImage[];
    external_urls: SpotifyExternalUrls;
    uri: string;
    type: string;
    total_episodes: number;
  };
};

export type SpotifySavedEpisode = {
  added_at: string;
  episode: {
    id: string;
    name: string;
    description: string;
    duration_ms: number;
    release_date: string;
    images: SpotifyImage[];
    external_urls: SpotifyExternalUrls;
    uri: string;
    type: string;
    show: {
      id: string;
      name: string;
    };
  };
};

export type SpotifyCategory = {
  id: string;
  name: string;
  icons: SpotifyImage[];
  href: string;
};

export type SpotifySearchResult = {
  tracks?: SpotifyPaginated<SpotifyTrack>;
  artists?: SpotifyPaginated<SpotifyArtist>;
  albums?: SpotifyPaginated<SimplifiedAlbum>;
  playlists?: SpotifyPaginated<SimplifiedPlaylist>;
  shows?: SpotifyPaginated<any>;
  episodes?: SpotifyPaginated<any>;
};

export type SpotifyAudioFeatures = {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
  uri: string;
  track_href: string;
  analysis_url: string;
  type: string;
};
