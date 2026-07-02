export type RedditThingKind = 'post' | 'comment' | 'subreddit' | 'message' | 'unknown';

let kindFromFullname = (fullname?: string): RedditThingKind => {
  if (fullname?.startsWith('t3_')) return 'post';
  if (fullname?.startsWith('t1_')) return 'comment';
  if (fullname?.startsWith('t5_')) return 'subreddit';
  if (fullname?.startsWith('t4_')) return 'message';
  return 'unknown';
};

let kindFromListingKind = (kind?: string, fullname?: string): RedditThingKind => {
  if (kind === 't3') return 'post';
  if (kind === 't1') return 'comment';
  if (kind === 't5') return 'subreddit';
  if (kind === 't4') return 'message';
  return kindFromFullname(fullname);
};

export let toIsoString = (seconds?: number) =>
  seconds ? new Date(seconds * 1000).toISOString() : undefined;

export let formatRedditThing = (child: any) => {
  let data = child?.data ?? child;
  if (!data || typeof data !== 'object') {
    return null;
  }

  let thingId =
    typeof data.name === 'string'
      ? data.name
      : typeof data.id === 'string' && typeof child?.kind === 'string'
        ? `${child.kind}_${data.id}`
        : undefined;

  if (!thingId) {
    return null;
  }

  let kind = kindFromListingKind(child?.kind, thingId);
  let permalink = data.permalink ? `https://www.reddit.com${data.permalink}` : undefined;
  let subredditName = data.subreddit ?? data.display_name ?? undefined;

  return {
    thingId,
    kind,
    postId: kind === 'post' ? thingId : data.link_id,
    commentId: kind === 'comment' ? thingId : undefined,
    subredditId: kind === 'subreddit' ? thingId : data.subreddit_id,
    title: data.title ?? data.link_title ?? data.display_name_prefixed ?? data.display_name,
    body: data.body ?? data.selftext ?? undefined,
    author: data.author ?? undefined,
    subredditName,
    score: data.score,
    numComments: data.num_comments,
    createdAt: toIsoString(data.created_utc),
    permalink,
    linkUrl: data.is_self ? undefined : data.url,
    isNsfw: data.over_18 ?? data.over18,
    isSpoiler: data.spoiler,
    isLocked: data.locked
  };
};

export let formatRedditListingItems = (listing: any) => {
  let children = listing?.data?.children ?? [];
  return children.map(formatRedditThing).filter(Boolean);
};
