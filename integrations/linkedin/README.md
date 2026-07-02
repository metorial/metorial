# <img src="https://provider-logos.metorial-cdn.com/linkedin.svg" height="20"> Linkedin

Authenticate a LinkedIn member with OpenID Connect, read the authenticated member profile, and create self-serve LinkedIn shares with text, article links, or uploaded images.

> Note: This slate is intentionally limited to the LinkedIn products that can coexist in a single self-serve OAuth app: `Sign in with LinkedIn using OpenID Connect` and `Share on LinkedIn`. Company pages, organization analytics, comments/reactions management, and Community Management workflows should move to a separate slate because LinkedIn restricts those products and scopes in the same app.

## Tools

### Get Profile

Retrieve the authenticated LinkedIn member's profile information including name, email, and profile picture. Uses the OpenID Connect userinfo endpoint to return the current user's identity.

### Create Post

Create a new member share on LinkedIn. Supports text posts, article shares (with a link), and image posts through the self-serve Share on LinkedIn product.

### Initialize Image Upload

Initialize an image upload for a member share on LinkedIn. Returns an upload URL and image URN. After uploading the image binary to the returned URL, use the image URN when creating a post with an attached image.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
