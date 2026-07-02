import { z } from 'zod';

export let postSchema = z.object({
  postId: z.string().describe('Unique ID of the post'),
  text: z.string().describe('Text content of the post'),
  authorId: z.string().optional().describe('User ID of the post author'),
  conversationId: z.string().optional().describe('Conversation thread ID'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the post was created'),
  lang: z.string().optional().describe('Language code of the post'),
  inReplyToUserId: z.string().optional().describe('User ID of the user being replied to'),
  likeCount: z.number().optional().describe('Number of likes'),
  retweetCount: z.number().optional().describe('Number of retweets'),
  replyCount: z.number().optional().describe('Number of replies'),
  quoteCount: z.number().optional().describe('Number of quote tweets'),
  impressionCount: z.number().optional().describe('Number of impressions'),
  source: z.string().optional().describe('Source application of the post')
});

export let userSchema = z.object({
  userId: z.string().describe('Unique ID of the user'),
  name: z.string().describe('Display name of the user'),
  username: z.string().describe('Username/handle of the user'),
  description: z.string().optional().describe('User bio/description'),
  profileImageUrl: z.string().optional().describe('URL of the profile image'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the account was created'),
  location: z.string().optional().describe('User-defined location'),
  url: z.string().optional().describe('User website URL'),
  isProtected: z.boolean().optional().describe('Whether the user account is protected'),
  isVerified: z.boolean().optional().describe('Whether the user is verified'),
  followersCount: z.number().optional().describe('Number of followers'),
  followingCount: z.number().optional().describe('Number of users being followed'),
  postCount: z.number().optional().describe('Number of posts')
});

export let listSchema = z.object({
  listId: z.string().describe('Unique ID of the list'),
  name: z.string().describe('Name of the list'),
  description: z.string().optional().describe('Description of the list'),
  ownerId: z.string().optional().describe('User ID of the list owner'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the list was created'),
  followerCount: z.number().optional().describe('Number of list followers'),
  memberCount: z.number().optional().describe('Number of list members'),
  isPrivate: z.boolean().optional().describe('Whether the list is private')
});

export let dmEventSchema = z.object({
  eventId: z.string().describe('Unique ID of the DM event'),
  text: z.string().optional().describe('Text content of the message'),
  senderId: z.string().optional().describe('User ID of the message sender'),
  conversationId: z.string().optional().describe('ID of the DM conversation'),
  eventType: z.string().optional().describe('Type of DM event'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the message was sent')
});

export let mapPost = (post: any) => ({
  postId: post.id,
  text: post.text,
  authorId: post.author_id,
  conversationId: post.conversation_id,
  createdAt: post.created_at,
  lang: post.lang,
  inReplyToUserId: post.in_reply_to_user_id,
  likeCount: post.public_metrics?.like_count,
  retweetCount: post.public_metrics?.retweet_count,
  replyCount: post.public_metrics?.reply_count,
  quoteCount: post.public_metrics?.quote_count,
  impressionCount: post.public_metrics?.impression_count,
  source: post.source
});

export let mapUser = (user: any) => ({
  userId: user.id,
  name: user.name,
  username: user.username,
  description: user.description,
  profileImageUrl: user.profile_image_url,
  createdAt: user.created_at,
  location: user.location,
  url: user.url,
  isProtected: user.protected,
  isVerified: user.verified,
  followersCount: user.public_metrics?.followers_count,
  followingCount: user.public_metrics?.following_count,
  postCount: user.public_metrics?.tweet_count
});

export let mapList = (list: any) => ({
  listId: list.id,
  name: list.name,
  description: list.description,
  ownerId: list.owner_id,
  createdAt: list.created_at,
  followerCount: list.follower_count,
  memberCount: list.member_count,
  isPrivate: list.private
});

export let mapDmEvent = (event: any) => ({
  eventId: event.id,
  text: event.text,
  senderId: event.sender_id,
  conversationId: event.dm_conversation_id,
  eventType: event.event_type,
  createdAt: event.created_at
});
