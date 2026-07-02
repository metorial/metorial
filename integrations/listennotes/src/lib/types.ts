export interface PodcastSimple {
  id: string;
  title: string;
  publisher: string;
  image: string;
  thumbnail: string;
  listennotes_url: string;
  listen_score: number;
  listen_score_global_rank: string;
  total_episodes: number;
  explicit_content: boolean;
  description: string;
  itunes_id: number;
  rss: string;
  latest_pub_date_ms: number;
  latest_episode_id: string;
  earliest_pub_date_ms: number;
  update_frequency_hours: number;
  genre_ids: number[];
  language: string;
  country: string;
  website: string;
  extra: Record<string, any>;
  is_claimed: boolean;
  type: string;
  email: string;
  audio_length_sec: number;
}

export interface EpisodeSimple {
  id: string;
  title: string;
  description: string;
  pub_date_ms: number;
  audio: string;
  audio_length_sec: number;
  image: string;
  thumbnail: string;
  explicit_content: boolean;
  listennotes_url: string;
  link: string;
  podcast: {
    id: string;
    title: string;
    publisher: string;
    image: string;
    thumbnail: string;
    listennotes_url: string;
    listen_score: number;
    listen_score_global_rank: string;
  };
}

export interface EpisodeFull extends EpisodeSimple {
  listennotes_edit_url: string;
  maybe_audio_invalid: boolean;
  transcript: string;
}

export interface PodcastFull extends PodcastSimple {
  episodes: EpisodeMinimum[];
  next_episode_pub_date: number;
  looking_for: Record<string, any>;
  has_guest_interviews: boolean;
  has_sponsors: boolean;
}

export interface EpisodeMinimum {
  id: string;
  title: string;
  description: string;
  pub_date_ms: number;
  audio: string;
  audio_length_sec: number;
  image: string;
  thumbnail: string;
  explicit_content: boolean;
  listennotes_url: string;
  link: string;
  maybe_audio_invalid: boolean;
}

export interface SearchResponse {
  took: number;
  count: number;
  total: number;
  next_offset: number;
  results: any[];
}

export interface TypeaheadResponse {
  terms: string[];
  genres: { id: number; name: string; parent_id: number }[];
  podcasts: any[];
}

export interface Genre {
  id: number;
  name: string;
  parent_id: number;
}

export interface CuratedListSimple {
  id: string;
  title: string;
  description: string;
  pub_date_ms: number;
  source_url: string;
  source_domain: string;
  listennotes_url: string;
  total: number;
}

export interface CuratedListFull extends CuratedListSimple {
  podcasts: PodcastSimple[];
}

export interface PlaylistItem {
  id: string;
  type: string;
  notes: string;
  added_at_ms: number;
  data: any;
}

export interface PlaylistResponse {
  id: string;
  name: string;
  description: string;
  image: string;
  thumbnail: string;
  type: string;
  visibility: string;
  owner: { name: string; image: string };
  created_at_ms: number;
  updated_at_ms: number;
  total: number;
  last_timestamp_ms: number;
  items: PlaylistItem[];
}

export interface PlaylistsResponse {
  page_number: number;
  has_previous: boolean;
  has_next: boolean;
  total: number;
  playlists: {
    id: string;
    name: string;
    description: string;
    image: string;
    thumbnail: string;
    visibility: string;
    total: number;
    updated_at_ms: number;
  }[];
}
