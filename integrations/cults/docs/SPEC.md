# Slates Specification for Cults

## Overview

Cults (Cults3D) is a marketplace for 3D printing designs where creators can publish, sell, and share downloadable 3D model files. It provides a GraphQL API that allows querying the catalog, managing creations, tracking sales, and accessing account data.

## Authentication

All API calls are made using HTTP Basic Auth.

To authenticate:

1. Create a Cults account or connect to your existing account, then go to the API page in your settings to generate an API key. The key generation page is at `https://cults3d.com/en/api/keys`.
2. Set the header `Authorization: Basic <base64(username:api_key)>`, where `username` is your Cults username and `api_key` is the key generated from settings.
3. There is only one endpoint URL: `https://cults3d.com/graphql`. All requests are POST requests with a JSON body containing a `query` field in GraphQL format.

Discord also mentions `Bearer` and `X-Api-Key` headers as alternative authentication methods, but HTTP Basic Auth is the primary documented approach.

No OAuth2 flow or scopes are involved. Each API key is tied to the user account that generated it.

## Features

### Browse and Search Creations

You can retrieve model data, search for designs, or get information about designers and makes. The API supports querying the catalog of 3D designs with filters such as category, price range, date, sorting options, trending lists, and the `madeWithAi` flag. The API will not give you access to the 3D files (they will remain hosted on Cults for legal reasons) but it will give you access to everything else: photos, titles, descriptions, tags, etc.

### Create and Manage Designs

Creators can publish new designs and update existing ones via mutations. This includes setting titles, descriptions, tags, meta tags, and categories. Assets are provided as URLs: respect the `fileUrls`/`imageUrls` limits of at most 10 links per field. Host assets using HTTPS links that expose the filename extension.

### Sales and Revenue Tracking

The API provides access to sales data (with applied discount, sale-time `creationViewsCount`/`creationLikesCount` snapshots), creator stats (`viewsCount`, `totalSalesAmount`, visibility), and user snapshots. You can query income per sale with currency conversion support.

### Orders and Downloads

Orders are accessible with `downloadUrl` for purchased items. This allows buyers to retrieve their order history and access links to files they have purchased.

### Account Data

Account data includes printlists (with nested creations), likes, orders, and user snapshots. You can query your own profile data, followers, and engagement metrics through the `myself` query root.

### Categories

The API provides access to the platform's category structure with localized names. Categories can be queried and used when creating or filtering designs.

### Upload Sharing Links

You can create links in the format `https://cults3d.com/en/creations/new?file_url=...&origin=...` to let users share 3D files to Cults from external sites in one click.

## Events

The provider does not support events. Cults3D does not offer webhooks, event subscriptions, or any built-in push notification mechanism through its API.
