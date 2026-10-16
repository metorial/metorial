# Matterport integration

Connect with a Matterport API Token ID and Token Secret, or an invitation-only Commercial Partner OAuth application. OAuth token requests use form encoding and preserve rotating refresh tokens.

The Model API endpoint is `https://api.matterport.com/api/models/graph`. Available tools search models with cursor pagination; read and update details, activation and visibility; list floors; create, read, update and delete annotation tags; retrieve floorplans, purchased bundles and panoramic images; purchase bundles; inspect dimensional data; and read notes and paginated comments. Purchases may incur charges. Asset and dimensional availability depend on the subscription and purchased add-ons. Existing URL and raw metadata fields remain available. Download links are renewed using the provider expiry when supplied.

Folder administration, account/user/role management, import/reconstruction, geographic coordinate editing, views/layers, and event subscriptions are outside this integration's registered tool surface. The Model API has no current-user query; account and user administration use the separate Enterprise-only Account API.

References:

- [Model API overview](https://matterport.github.io/developer-docs/api/model/overview/)
- [Sample queries](https://matterport.github.io/developer-docs/api/model/samples/)
- [Models search](https://matterport.github.io/developer-docs/api/model/queries/)
- [OAuth](https://matterport.github.io/developer-docs/oauth/model-api/)
- [Ordering add-ons](https://matterport.github.io/developer-docs/api/model/ordering-addons/)
