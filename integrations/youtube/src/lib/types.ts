export interface YouTubePageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
  standard?: YouTubeThumbnail;
  maxres?: YouTubeThumbnail;
}

export interface YouTubeVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: string;
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
  defaultAudioLanguage?: string;
}

export interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount: string;
  dislikeCount?: string;
  favoriteCount: string;
  commentCount: string;
}

export interface YouTubeVideoContentDetails {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  projection: string;
}

export interface YouTubeVideoStatus {
  uploadStatus: string;
  failureReason?: string;
  rejectionReason?: string;
  privacyStatus: string;
  publishAt?: string;
  license: string;
  embeddable: boolean;
  publicStatsViewable: boolean;
  madeForKids: boolean;
  selfDeclaredMadeForKids?: boolean;
}

export interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet?: YouTubeVideoSnippet;
  contentDetails?: YouTubeVideoContentDetails;
  status?: YouTubeVideoStatus;
  statistics?: YouTubeVideoStatistics;
  player?: {
    embedHtml: string;
  };
}

export interface YouTubeListResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: YouTubePageInfo;
  items: T[];
}

export interface YouTubeSearchResult {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    liveBroadcastContent: string;
  };
}

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: YouTubeThumbnails;
  localized?: {
    title: string;
    description: string;
  };
  country?: string;
}

export interface YouTubeChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  hiddenSubscriberCount: boolean;
  videoCount: string;
}

export interface YouTubeChannel {
  kind: string;
  etag: string;
  id: string;
  snippet?: YouTubeChannelSnippet;
  statistics?: YouTubeChannelStatistics;
  contentDetails?: {
    relatedPlaylists: {
      likes?: string;
      uploads?: string;
    };
  };
  brandingSettings?: {
    channel?: {
      title?: string;
      description?: string;
      keywords?: string;
      unsubscribedTrailer?: string;
      country?: string;
    };
    image?: {
      bannerExternalUrl?: string;
    };
  };
}

export interface YouTubePlaylistSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  defaultLanguage?: string;
  localized?: {
    title: string;
    description: string;
  };
}

export interface YouTubePlaylist {
  kind: string;
  etag: string;
  id: string;
  snippet?: YouTubePlaylistSnippet;
  status?: {
    privacyStatus: string;
  };
  contentDetails?: {
    itemCount: number;
  };
}

export interface YouTubePlaylistItem {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    channelTitle: string;
    playlistId: string;
    position: number;
    resourceId: {
      kind: string;
      videoId: string;
    };
  };
  contentDetails?: {
    videoId: string;
    videoPublishedAt?: string;
  };
  status?: {
    privacyStatus: string;
  };
}

export interface YouTubeCommentSnippet {
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelUrl: string;
  authorChannelId?: {
    value: string;
  };
  textDisplay: string;
  textOriginal: string;
  parentId?: string;
  canRate: boolean;
  viewerRating: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
  videoId?: string;
  channelId?: string;
}

export interface YouTubeComment {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeCommentSnippet;
}

export interface YouTubeCommentThread {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    channelId: string;
    videoId: string;
    topLevelComment: YouTubeComment;
    canReply: boolean;
    totalReplyCount: number;
    isPublic: boolean;
  };
  replies?: {
    comments: YouTubeComment[];
  };
}

export interface YouTubeSubscription {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    title: string;
    description: string;
    resourceId: {
      kind: string;
      channelId: string;
    };
    channelId: string;
    thumbnails: YouTubeThumbnails;
  };
  contentDetails?: {
    totalItemCount: number;
    newItemCount: number;
    activityType: string;
  };
}

export interface YouTubeCaption {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    videoId: string;
    lastUpdated: string;
    trackKind: string;
    language: string;
    name: string;
    audioTrackType: string;
    isCC: boolean;
    isLarge: boolean;
    isEasyReader: boolean;
    isDraft: boolean;
    isAutoSynced: boolean;
    status: string;
    failureReason?: string;
  };
}

export interface YouTubeActivity {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: YouTubeThumbnails;
    type: string;
    groupId?: string;
  };
  contentDetails?: {
    upload?: {
      videoId: string;
    };
    like?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
    };
    favorite?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
    };
    comment?: {
      resourceId: {
        kind: string;
        videoId: string;
        channelId?: string;
      };
    };
    subscription?: {
      resourceId: {
        kind: string;
        channelId: string;
      };
    };
    playlistItem?: {
      resourceId: {
        kind: string;
        videoId: string;
      };
      playlistId: string;
    };
    recommendation?: {
      resourceId: {
        kind: string;
        videoId: string;
        channelId?: string;
      };
    };
    bulletin?: {
      resourceId?: {
        kind: string;
        videoId?: string;
        channelId?: string;
        playlistId?: string;
      };
    };
    social?: {
      type: string;
      resourceId: {
        kind: string;
        videoId?: string;
        channelId?: string;
        playlistId?: string;
      };
      author: string;
      referenceUrl?: string;
      imageUrl?: string;
    };
    channelItem?: {
      resourceId: {
        kind: string;
        channelId?: string;
      };
    };
  };
}
