# <img src="https://provider-logos.metorial-cdn.com/reddit.svg" height="20"> Reddit

Browse, search, and interact with Reddit communities (subreddits). Submit text and link posts to subreddits. Comment on posts and reply to comments. Upvote and downvote content. Edit and delete your own posts and comments. Save and unsave content, including reading saved categories. Search Reddit for posts and subreddits. Resolve posts, comments, and subreddits by fullname or URL. Fetch subreddit information, rules, and posts sorted by hot, new, top, or controversial. Access user profiles, account history listings, and karma data. Send and receive private messages. Subscribe and unsubscribe from subreddits. Manage subreddit moderation tasks including approving or removing posts and comments and accessing mod queues, reports, and logs. Set and manage user and post flairs. Read and edit subreddit wiki pages.

## Tools

### Get Post

Retrieve a specific Reddit post with its comments. Returns the post details and a tree of comments sorted by the specified order.

### Get Content Info

Look up Reddit posts, comments, or subreddits by fullname, Reddit URL, or subreddit name using Reddit's batch info endpoint. Use this when you already have IDs from another workflow and need normalized metadata before acting on the content.

### Get Subreddit

Retrieve information about a subreddit including its description, subscriber count, rules, and current posts. Use this to explore subreddit metadata, discover community rules, or browse current content sorted by hot, new, top, or controversial.

### Get User

Retrieve a Reddit user's public profile information, including karma, account age, and optionally their recent posts or comments. Use without a username to get the authenticated user's own profile.

### List User Content

List a Reddit user's overview, posts, comments, saved items, hidden items, voted items, or gilded items. Use this for account history workflows that need saved/hidden/voted listings rather than only public profile metadata.

### Manage Comment

Edit or delete your own comments on Reddit.

### Manage Flair

Get available flair options for a subreddit, or set user/post flair. Retrieve both user flair and link (post) flair templates, or assign flair to users and posts.

### Manage Messages

Send private messages, read your inbox or unread messages, and mark messages as read or unread. Supports retrieving inbox, unread, and sent message folders.

### Manage Post

Edit, delete, hide/unhide, or toggle NSFW/spoiler flags on your own posts. Use this to modify existing posts after submission.

### Manage Subscriptions

Subscribe or unsubscribe from subreddits, or list the authenticated user's current subscriptions and moderated subreddits.

### Manage Wiki

Read, edit, and list subreddit wiki pages. View page content, list all pages in a subreddit wiki, or edit page content with an optional revision reason.

### Moderate Content

Perform moderation actions on posts and comments in subreddits you moderate. Supports approving, removing, distinguishing content, and viewing the mod queue, mod log, and reports.

### Save Content

Save or unsave a post or comment to your Reddit saved items, or list saved categories available to the authenticated account.

### Search Reddit

Search across Reddit for posts matching specific keywords. Optionally restrict the search to a specific subreddit. Also supports searching for subreddits themselves by name or topic.

### Submit Comment

Post a comment on a Reddit post or reply to an existing comment. Pass a post fullname (t3*\*) to comment on a post, or a comment fullname (t1*\*) to reply to a comment.

### Submit Post

Submit a new post to a subreddit. Supports both text (self) posts and link posts. Optionally set flair, mark as NSFW or spoiler, and control inbox reply notifications.

### Vote

Upvote, downvote, or remove your vote on a post or comment.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
