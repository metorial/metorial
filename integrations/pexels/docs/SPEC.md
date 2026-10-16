# Pexels API integration

The integration covers photo search, curated photos, photo retrieval, video search,
popular videos, video retrieval, featured and personal collections, and collection media.
Explicit photo and video download tools prepare the media URLs returned by Pexels.

## Authentication and configuration

Supply a Pexels API key. Requests send the key directly in the `Authorization`
header; there is no OAuth flow. No additional connection configuration is required.
The public API does not expose a current-user endpoint.

## Tools

| Tool | Provider request or behavior |
| --- | --- |
| `search_photos` | `GET /v1/search`; query, orientation, size, color, locale, pagination |
| `curated_photos` | `GET /v1/curated`; pagination |
| `get_photo` | `GET /v1/photos/{id}` |
| `search_videos` | `GET /videos/search`; query, orientation, size, locale, pagination |
| `popular_videos` | `GET /videos/popular`; minimum width/height and minimum/maximum duration |
| `get_video` | `GET /videos/videos/{id}` |
| `list_collections` | `GET /v1/collections/featured` or `GET /v1/collections` |
| `get_collection_media` | `GET /v1/collections/{id}`; media type, sort, pagination |
| `download_photo` | Retrieves the photo, then prepares the selected `src` image URL |
| `download_video` | Retrieves the video, then prepares the selected `video_files` URL |

Existing video requests retain their legacy paths for compatibility. Pexels documents
new `/v1/videos/` routes and future deprecation of the old paths. Their retirement
has not been announced in the documentation reviewed for this refresh.

Photo and video IDs and pagination remain numeric inputs. Whole-number constraints
are validated at invocation time. Pagination defaults remain provider-managed;
page defaults to 1 and page size to 15, with a maximum of 80 results. Popular-video
minima can be zero; minimum duration must not exceed maximum duration.

Normalized photo text/color fields and video-file dimensions are omitted when their
provider values are null. Original resource metadata, including those nulls, is
available in `raw`. Curated-photo totals are absent when Pexels omits them. Collection
descriptions and video-file frame rates retain optional scalar output types.

Downloads use the actual media URLs returned by Pexels without transmitting the API
key to the media host. HLS playlists are excluded from standalone video downloads.
The integration does not infer media expiry times. A fresh download invocation obtains
current media details. No API endpoint creates or edits collections, and no webhook
subscription is documented.

## Usage requirements

Link to Pexels and credit the creator when displaying media. API applications must
follow Pexels' usage guidelines, including restrictions on replicating its core service.
Default account quotas are 200 requests per hour and 20,000 per month; higher account
limits may apply.

## Official references

- [API documentation](https://www.pexels.com/api/documentation/)
- [Official JavaScript response types](https://github.com/pexels/pexels-javascript/blob/master/src/types.ts)
- [Official photo endpoint return types](https://github.com/pexels/pexels-javascript/blob/master/src/generatePhotoEndpoints.ts)
- [Official collection endpoint return types](https://github.com/pexels/pexels-javascript/blob/master/src/generateCollectionEndpoints.ts)
