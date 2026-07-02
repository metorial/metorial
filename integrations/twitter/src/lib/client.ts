import { createAxios } from '@slates/provider';
import { twitterApiError } from './errors';

let createTwitterClient = (token: string) => {
  return createAxios({
    baseURL: 'https://api.x.com/2',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

export let DEFAULT_POST_FIELDS =
  'id,text,created_at,author_id,conversation_id,in_reply_to_user_id,lang,public_metrics,source,edit_history_tweet_ids';
export let DEFAULT_USER_FIELDS =
  'id,name,username,created_at,description,profile_image_url,public_metrics,verified,location,url,protected';
export let DEFAULT_MEDIA_FIELDS = 'media_key,type,url,preview_image_url,alt_text,width,height';
export let DEFAULT_EXPANSIONS =
  'author_id,referenced_tweets.id,attachments.media_keys,in_reply_to_user_id';

export let SIMPLE_MEDIA_CATEGORIES = ['tweet_image', 'dm_image', 'subtitles'] as const;
export let SIMPLE_MEDIA_TYPES = [
  'text/srt',
  'text/vtt',
  'image/jpeg',
  'image/bmp',
  'image/png',
  'image/webp',
  'image/pjpeg',
  'image/tiff'
] as const;

export class TwitterClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createTwitterClient(token);
    this.api.interceptors.response.use(
      response => response,
      error => {
        throw twitterApiError(error);
      }
    );
  }

  // ==================== Users ====================

  async getMe() {
    let response = await this.api.get('/users/me', {
      params: {
        'user.fields': DEFAULT_USER_FIELDS
      }
    });
    return response.data;
  }

  async getUserById(userId: string) {
    let response = await this.api.get(`/users/${userId}`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS
      }
    });
    return response.data;
  }

  async getUserByUsername(username: string) {
    let response = await this.api.get(`/users/by/username/${username}`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS
      }
    });
    return response.data;
  }

  async getUsersByUsernames(usernames: string[]) {
    let response = await this.api.get('/users/by', {
      params: {
        usernames: usernames.join(','),
        'user.fields': DEFAULT_USER_FIELDS
      }
    });
    return response.data;
  }

  // ==================== Posts ====================

  async getPost(postId: string) {
    let response = await this.api.get(`/tweets/${postId}`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS
      }
    });
    return response.data;
  }

  async getPosts(postIds: string[]) {
    let response = await this.api.get('/tweets', {
      params: {
        ids: postIds.join(','),
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS
      }
    });
    return response.data;
  }

  async createPost(params: {
    text: string;
    replyToPostId?: string;
    quotePostId?: string;
    mediaIds?: string[];
    mediaTaggedUserIds?: string[];
    pollOptions?: string[];
    pollDurationMinutes?: number;
    replySettings?: 'following' | 'mentionedUsers' | 'subscribers' | 'verified';
  }) {
    let body: Record<string, any> = { text: params.text };

    if (params.replyToPostId) {
      body.reply = { in_reply_to_tweet_id: params.replyToPostId };
    }

    if (params.quotePostId) {
      body.quote_tweet_id = params.quotePostId;
    }

    if (params.mediaIds && params.mediaIds.length > 0) {
      body.media = { media_ids: params.mediaIds };
      if (params.mediaTaggedUserIds && params.mediaTaggedUserIds.length > 0) {
        body.media.tagged_user_ids = params.mediaTaggedUserIds;
      }
    }

    if (params.pollOptions && params.pollOptions.length > 0) {
      body.poll = {
        options: params.pollOptions,
        duration_minutes: params.pollDurationMinutes || 1440
      };
    }

    if (params.replySettings) {
      body.reply_settings = params.replySettings;
    }

    let response = await this.api.post('/tweets', body);
    return response.data;
  }

  async deletePost(postId: string) {
    let response = await this.api.delete(`/tweets/${postId}`);
    return response.data;
  }

  // ==================== Timelines ====================

  async getUserTimeline(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
      exclude?: string[];
    }
  ) {
    let response = await this.api.get(`/users/${userId}/tweets`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS,
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken,
        since_id: params?.sinceId,
        until_id: params?.untilId,
        start_time: params?.startTime,
        end_time: params?.endTime,
        exclude: params?.exclude?.join(',')
      }
    });
    return response.data;
  }

  async getUserMentions(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/mentions`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS,
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken,
        since_id: params?.sinceId,
        until_id: params?.untilId,
        start_time: params?.startTime,
        end_time: params?.endTime
      }
    });
    return response.data;
  }

  async getReverseChronologicalTimeline(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
      exclude?: string[];
    }
  ) {
    let response = await this.api.get(`/users/${userId}/timelines/reverse_chronological`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS,
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken,
        since_id: params?.sinceId,
        until_id: params?.untilId,
        start_time: params?.startTime,
        end_time: params?.endTime,
        exclude: params?.exclude?.join(',')
      }
    });
    return response.data;
  }

  // ==================== Search ====================

  async searchRecentPosts(
    query: string,
    params?: {
      maxResults?: number;
      nextToken?: string;
      sinceId?: string;
      untilId?: string;
      startTime?: string;
      endTime?: string;
      sortOrder?: string;
    }
  ) {
    let response = await this.api.get('/tweets/search/recent', {
      params: {
        query,
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        'media.fields': DEFAULT_MEDIA_FIELDS,
        expansions: DEFAULT_EXPANSIONS,
        max_results: params?.maxResults || 10,
        next_token: params?.nextToken,
        since_id: params?.sinceId,
        until_id: params?.untilId,
        start_time: params?.startTime,
        end_time: params?.endTime,
        sort_order: params?.sortOrder
      }
    });
    return response.data;
  }

  // ==================== Likes ====================

  async likePost(userId: string, postId: string) {
    let response = await this.api.post(`/users/${userId}/likes`, {
      tweet_id: postId
    });
    return response.data;
  }

  async unlikePost(userId: string, postId: string) {
    let response = await this.api.delete(`/users/${userId}/likes/${postId}`);
    return response.data;
  }

  async getLikedPosts(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/liked_tweets`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async getPostLikingUsers(
    postId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/tweets/${postId}/liking_users`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Retweets ====================

  async retweet(userId: string, postId: string) {
    let response = await this.api.post(`/users/${userId}/retweets`, {
      tweet_id: postId
    });
    return response.data;
  }

  async undoRetweet(userId: string, postId: string) {
    let response = await this.api.delete(`/users/${userId}/retweets/${postId}`);
    return response.data;
  }

  async getRetweetedByUsers(
    postId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/tweets/${postId}/retweeted_by`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Bookmarks ====================

  async getBookmarks(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/bookmarks`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async addBookmark(userId: string, postId: string) {
    let response = await this.api.post(`/users/${userId}/bookmarks`, {
      tweet_id: postId
    });
    return response.data;
  }

  async removeBookmark(userId: string, postId: string) {
    let response = await this.api.delete(`/users/${userId}/bookmarks/${postId}`);
    return response.data;
  }

  // ==================== Follows ====================

  async followUser(userId: string, targetUserId: string) {
    let response = await this.api.post(`/users/${userId}/following`, {
      target_user_id: targetUserId
    });
    return response.data;
  }

  async unfollowUser(userId: string, targetUserId: string) {
    let response = await this.api.delete(`/users/${userId}/following/${targetUserId}`);
    return response.data;
  }

  async getFollowers(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/followers`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async getFollowing(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/following`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Blocks ====================

  async blockUser(userId: string, targetUserId: string) {
    let response = await this.api.post(`/users/${userId}/blocking`, {
      target_user_id: targetUserId
    });
    return response.data;
  }

  async unblockUser(userId: string, targetUserId: string) {
    let response = await this.api.delete(`/users/${userId}/blocking/${targetUserId}`);
    return response.data;
  }

  async getBlockedUsers(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/blocking`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Mutes ====================

  async muteUser(userId: string, targetUserId: string) {
    let response = await this.api.post(`/users/${userId}/muting`, {
      target_user_id: targetUserId
    });
    return response.data;
  }

  async unmuteUser(userId: string, targetUserId: string) {
    let response = await this.api.delete(`/users/${userId}/muting/${targetUserId}`);
    return response.data;
  }

  async getMutedUsers(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/muting`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Direct Messages ====================

  async getDmEvents(params?: {
    maxResults?: number;
    paginationToken?: string;
    dmEventFields?: string;
    eventTypes?: string;
  }) {
    let response = await this.api.get('/dm_events', {
      params: {
        'dm_event.fields':
          params?.dmEventFields ||
          'id,text,created_at,sender_id,dm_conversation_id,event_type,attachments,referenced_tweets',
        'user.fields': DEFAULT_USER_FIELDS,
        expansions: 'sender_id,referenced_tweets.id',
        max_results: params?.maxResults || 20,
        pagination_token: params?.paginationToken,
        event_types: params?.eventTypes || 'MessageCreate'
      }
    });
    return response.data;
  }

  async getDmConversationEvents(
    conversationId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/dm_conversations/${conversationId}/dm_events`, {
      params: {
        'dm_event.fields': 'id,text,created_at,sender_id,dm_conversation_id,event_type',
        'user.fields': DEFAULT_USER_FIELDS,
        expansions: 'sender_id',
        max_results: params?.maxResults || 20,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async getDmConversationEventsWithParticipant(
    participantId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/dm_conversations/with/${participantId}/dm_events`, {
      params: {
        'dm_event.fields': 'id,text,created_at,sender_id,dm_conversation_id,event_type',
        'user.fields': DEFAULT_USER_FIELDS,
        expansions: 'sender_id',
        max_results: params?.maxResults || 20,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  private buildDmMessageBody(text: string, mediaId?: string) {
    let body: Record<string, any> = { text };
    if (mediaId) {
      body.attachments = [{ media_id: mediaId }];
    }
    return body;
  }

  async sendDmToUser(participantId: string, text: string, mediaId?: string) {
    let response = await this.api.post(
      `/dm_conversations/with/${participantId}/messages`,
      this.buildDmMessageBody(text, mediaId)
    );
    return response.data;
  }

  async sendDmToConversation(conversationId: string, text: string, mediaId?: string) {
    let response = await this.api.post(
      `/dm_conversations/${conversationId}/messages`,
      this.buildDmMessageBody(text, mediaId)
    );
    return response.data;
  }

  async createDmConversation(participantIds: string[], text: string, mediaId?: string) {
    let response = await this.api.post('/dm_conversations', {
      conversation_type: 'Group',
      participant_ids: participantIds,
      message: this.buildDmMessageBody(text, mediaId)
    });
    return response.data;
  }

  async deleteDmEvent(eventId: string) {
    let response = await this.api.delete(`/dm_events/${eventId}`);
    return response.data;
  }

  // ==================== Lists ====================

  async getList(listId: string) {
    let response = await this.api.get(`/lists/${listId}`, {
      params: {
        'list.fields':
          'id,name,description,owner_id,created_at,follower_count,member_count,private'
      }
    });
    return response.data;
  }

  async getUserOwnedLists(
    userId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/users/${userId}/owned_lists`, {
      params: {
        'list.fields':
          'id,name,description,owner_id,created_at,follower_count,member_count,private',
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async createList(name: string, description?: string, isPrivate?: boolean) {
    let response = await this.api.post('/lists', {
      name,
      description,
      private: isPrivate
    });
    return response.data;
  }

  async updateList(
    listId: string,
    params: { name?: string; description?: string; isPrivate?: boolean }
  ) {
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.description !== undefined) body.description = params.description;
    if (params.isPrivate !== undefined) body.private = params.isPrivate;

    let response = await this.api.put(`/lists/${listId}`, body);
    return response.data;
  }

  async deleteList(listId: string) {
    let response = await this.api.delete(`/lists/${listId}`);
    return response.data;
  }

  async addListMember(listId: string, userId: string) {
    let response = await this.api.post(`/lists/${listId}/members`, {
      user_id: userId
    });
    return response.data;
  }

  async removeListMember(listId: string, userId: string) {
    let response = await this.api.delete(`/lists/${listId}/members/${userId}`);
    return response.data;
  }

  async getListMembers(
    listId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/lists/${listId}/members`, {
      params: {
        'user.fields': DEFAULT_USER_FIELDS,
        max_results: params?.maxResults || 100,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  async getListPosts(
    listId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/lists/${listId}/tweets`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        expansions: 'author_id',
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Quote Tweets ====================

  async getQuotePosts(
    postId: string,
    params?: {
      maxResults?: number;
      paginationToken?: string;
    }
  ) {
    let response = await this.api.get(`/tweets/${postId}/quote_tweets`, {
      params: {
        'tweet.fields': DEFAULT_POST_FIELDS,
        'user.fields': DEFAULT_USER_FIELDS,
        expansions: 'author_id',
        max_results: params?.maxResults || 10,
        pagination_token: params?.paginationToken
      }
    });
    return response.data;
  }

  // ==================== Media Upload ====================

  async uploadMedia(params: {
    mediaBase64: string;
    mediaCategory: (typeof SIMPLE_MEDIA_CATEGORIES)[number];
    mediaType?: (typeof SIMPLE_MEDIA_TYPES)[number];
    additionalOwnerIds?: string[];
    shared?: boolean;
  }) {
    let response = await this.api.post('/media/upload', {
      media: params.mediaBase64,
      media_category: params.mediaCategory,
      media_type: params.mediaType,
      additional_owners: params.additionalOwnerIds,
      shared: params.shared
    });
    return response.data;
  }

  async getMediaUploadStatus(mediaId: string) {
    let response = await this.api.get('/media/upload', {
      params: {
        command: 'STATUS',
        media_id: mediaId
      }
    });
    return response.data;
  }

  // ==================== Hide Replies ====================

  async hideReply(postId: string) {
    let response = await this.api.put(`/tweets/${postId}/hidden`, {
      hidden: true
    });
    return response.data;
  }

  async unhideReply(postId: string) {
    let response = await this.api.put(`/tweets/${postId}/hidden`, {
      hidden: false
    });
    return response.data;
  }
}
