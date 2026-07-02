import { WordPressClient } from './client';

export let createClient = (
  config: { siteUrl: string; apiType: 'wpcom' | 'selfhosted' },
  auth: { token: string; authMethod: 'oauth' | 'application_password' }
) => {
  return new WordPressClient({
    siteUrl: config.siteUrl,
    apiType: config.apiType,
    token: auth.token,
    authMethod: auth.authMethod
  });
};

export let extractPostSummary = (post: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      postId: String(post.ID),
      title: post.title || '',
      status: post.status || '',
      url: post.URL || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      date: post.date || '',
      modifiedDate: post.modified || '',
      authorName: post.author?.name || '',
      commentCount: post.discussion?.comment_count || 0,
      likeCount: post.like_count || 0,
      format: post.format || 'standard',
      type: post.type || 'post'
    };
  } else {
    return {
      postId: String(post.id),
      title: post.title?.rendered || post.title || '',
      status: post.status || '',
      url: post.link || '',
      slug: post.slug || '',
      excerpt: post.excerpt?.rendered || '',
      date: post.date || '',
      modifiedDate: post.modified || '',
      authorName: String(post.author || ''),
      commentCount: 0,
      likeCount: 0,
      format: post.format || 'standard',
      type: post.type || 'post'
    };
  }
};

export let extractCommentSummary = (comment: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      commentId: String(comment.ID),
      postId: String(comment.post?.ID || ''),
      authorName: comment.author?.name || '',
      authorEmail: comment.author?.email || '',
      content: comment.content || '',
      status: comment.status || '',
      date: comment.date || '',
      parentCommentId: String(comment.parent?.ID || '0'),
      type: comment.type || 'comment'
    };
  } else {
    return {
      commentId: String(comment.id),
      postId: String(comment.post || ''),
      authorName: comment.author_name || '',
      authorEmail: comment.author_email || '',
      content: comment.content?.rendered || comment.content || '',
      status: comment.status || '',
      date: comment.date || '',
      parentCommentId: String(comment.parent || '0'),
      type: comment.type || 'comment'
    };
  }
};

export let extractMediaSummary = (media: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      mediaId: String(media.ID),
      title: media.title || '',
      url: media.URL || '',
      mimeType: media.mime_type || '',
      caption: media.caption || '',
      altText: media.alt || '',
      description: media.description || '',
      date: media.date || '',
      width: media.width || 0,
      height: media.height || 0
    };
  } else {
    return {
      mediaId: String(media.id),
      title: media.title?.rendered || media.title || '',
      url: media.source_url || '',
      mimeType: media.mime_type || '',
      caption: media.caption?.rendered || '',
      altText: media.alt_text || '',
      description: media.description?.rendered || '',
      date: media.date || '',
      width: media.media_details?.width || 0,
      height: media.media_details?.height || 0
    };
  }
};

export let extractCategorySummary = (cat: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      categoryId: String(cat.ID),
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      parentId: String(cat.parent || '0'),
      postCount: cat.post_count || 0
    };
  } else {
    return {
      categoryId: String(cat.id),
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      parentId: String(cat.parent || '0'),
      postCount: cat.count || 0
    };
  }
};

export let extractTagSummary = (tag: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      tagId: String(tag.ID),
      name: tag.name || '',
      slug: tag.slug || '',
      description: tag.description || '',
      postCount: tag.post_count || 0
    };
  } else {
    return {
      tagId: String(tag.id),
      name: tag.name || '',
      slug: tag.slug || '',
      description: tag.description || '',
      postCount: tag.count || 0
    };
  }
};

export let extractUserSummary = (user: any, apiType: 'wpcom' | 'selfhosted') => {
  if (apiType === 'wpcom') {
    return {
      userId: String(user.ID),
      username: user.login || user.nice_name || '',
      name: user.name || '',
      email: user.email || '',
      avatarUrl: user.avatar_URL || '',
      roles: user.roles || [],
      profileUrl: user.profile_URL || ''
    };
  } else {
    return {
      userId: String(user.id),
      username: user.slug || '',
      name: user.name || '',
      email: user.email || '',
      avatarUrl: user.avatar_urls?.['96'] || '',
      roles: user.roles || [],
      profileUrl: user.link || ''
    };
  }
};
