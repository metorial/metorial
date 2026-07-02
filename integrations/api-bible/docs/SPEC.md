Now let me get more details about the API features:Now I have enough information to write the specification.

# Slates Specification for API.Bible

## Overview

API.Bible is a REST API operated by American Bible Society that provides access to Bible scripture content in text and audio formats. It offers nearly 2500 Bible versions available across over 1600 languages. It has a direct integration to the Digital Bible Library (DBL) content library, allowing developers to include Scripture content in their websites and applications.

## Authentication

API.Bible uses API key authentication. Before you can access the API you must first create an account to retrieve your own personalized API key. Once your application has been approved you can find your API key in your Dashboard settings.

The authentication process uses a variation of HTTP Basic Auth. For each request you must place your private key into the `api-key` header.

Example request:

```
curl --request GET \
  --url https://api.scripture.api.bible/v1/bibles \
  --header 'api-key: YOUR_API_KEY'
```

Your API key determines which Bibles you can access. Optionally, users who hold Digital Bible Library (DBL) accounts can link their DBL API key to their API.Bible app settings to gain access to additional DBL content items they have permission to use.

## Features

### Bible Version Discovery

Browse and retrieve metadata about available Bible versions (translations/editions). Specific editions of the Bible such as the New International Version (NIV) or King James Version (KJV) can be listed, and versions have many books. Versions include metadata such as name, abbreviation, language, country, and copyright information. You can filter Bibles by language and other criteria.

### Scripture Content Retrieval

Access the hierarchical structure of Bible content: books, chapters, verses, passages, and sections. Use books, chapters, or verses endpoints to retrieve text, with parameters like `include-notes`, `include-titles`, and `include-chapter-numbers` for richer output. Content is returned in a unified HTML format across all versions. You can get content for an entire chapter or specify a slimmed down range of passages by combining two verse IDs with a dash.

### Sections

Retrieve a list of sections for a designated chapter along with titles of those sections (e.g., "The Birth of Jesus Christ"). Sections provide thematic groupings of verses that span across chapter boundaries.

### Scripture Search

Search the Bible for any reference or keyword directly from your site or app. Queries by default will match all verses for all books. In order to query for specific passage content, you must structure your query in a particular way. Search can be scoped to specific books or ranges.

### Audio Bibles

API.Bible provides the Bible in text and audio on-demand in the versions and languages you are looking for. Audio Bible versions can be listed and their content retrieved separately from text versions.

### Fair Use Management System (FUMS)

All API responses for scripture content include a FUMS token that must be reported back to API.Bible to track scripture engagement. This is a privacy-focused solution that tracks scripture usage and anonymized user viewing data. It also allows profiling of usage of the various versions, books, chapters, and verses so that the value of API-accessible Scripture texts can be communicated back to copyright holders and publishers. FUMS implementation is required for all applications using the API.

## Events

The provider does not support events.
