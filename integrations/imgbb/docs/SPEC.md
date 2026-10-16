# ImgBB API specification

## Overview

ImgBB is an image hosting and sharing platform. Its [API v1](https://api.imgbb.com/) documents image uploads and hosted URLs.

## Authentication

ImgBB uses **API key** authentication.

- Users obtain an API key by creating an account at [imgbb.com](https://imgbb.com) and then visiting [api.imgbb.com](https://api.imgbb.com/) to generate a key.
- The API key is passed as a query parameter named `key` on every request.
- Example: `POST https://api.imgbb.com/1/upload?key=YOUR_API_KEY`
- There are no OAuth flows, scopes, or additional credentials required.

## Features

### Image Upload

Upload images to ImgBB and receive publicly accessible hosted URLs (direct URL, viewer URL, display URL, and thumbnail URL).

- **Image source**: The tool accepts base64-encoded data or an image URL. The provider also supports binary multipart files; encode local files as base64 for this tool. Maximum file size is 32 MB.
- **Custom filename**: Optionally specify a filename for the uploaded image. Automatically detected when uploading via multipart/form-data.
- **Auto-expiration**: Optionally set a whole number of seconds from 60 to 15,552,000, after which the image is automatically deleted.
- The tool provides a downloadable original image and preserves the hosted URLs: original, thumbnail, medium-sized when available, viewer, display, and the delete URL for manual removal. Keep the delete URL secure.
- The documented upload response represents dimensions, size, time, and expiration as numeric strings; the tool preserves its numeric output contract by validating and converting dimensions, size, and expiration.
- The public API documentation exposes no identity, listing, search, update, or API deletion endpoints. The returned delete URL is for manual removal. Automatic image deletion removes the content; the API documents no renewal endpoint.

## Events

The public API documentation does not expose events or webhook registration.
