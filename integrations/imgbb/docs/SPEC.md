# Slates Specification for ImgBB

## Overview

ImgBB is a free image hosting and sharing platform. Its API (v1) provides a single capability: uploading images to ImgBB's servers and receiving hosted URLs in return. Supported image formats include JPG, PNG, BMP, and GIF.

## Authentication

ImgBB uses **API key** authentication.

- Users obtain an API key by creating an account at [imgbb.com](https://imgbb.com) and then visiting [api.imgbb.com](https://api.imgbb.com/) to generate a key.
- The API key is passed as a query parameter named `key` on every request.
- Example: `POST https://api.imgbb.com/1/upload?key=YOUR_API_KEY`
- There are no OAuth flows, scopes, or additional credentials required.

## Features

### Image Upload

Upload images to ImgBB and receive publicly accessible hosted URLs (direct URL, viewer URL, display URL, and thumbnail URL).

- **Image source**: Accepts a binary file (via multipart/form-data), base64-encoded data, or a URL pointing to an image. Maximum file size is 32 MB.
- **Custom filename**: Optionally specify a filename for the uploaded image. Automatically detected when uploading via multipart/form-data.
- **Auto-expiration**: Optionally set an expiration time (in seconds, between 60 and 15,552,000) after which the image is automatically deleted.
- The API response includes multiple image variants: original, thumbnail, and medium-sized versions, along with a delete URL for manual removal.
- The API is upload-only; there are no endpoints to list, search, update, or delete previously uploaded images programmatically.

## Events

The provider does not support events.
