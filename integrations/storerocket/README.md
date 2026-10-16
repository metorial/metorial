# <img src="logo.svg" height="20"> StoreRocket

Discover StoreRocket projects, retrieve their locations, and update selected location details or opening hours. The project-list and location-list tools retain complete provider responses, including identifiers and location details when returned.

Create a Bearer token under **Dashboard → API Tokens**. REST API access requires the **Business** plan. Call `list_projects`, then pass a project ID to `list_project_locations`. Use the returned location ID with `update_location`; its token requires `location:update`. Omitted update fields stay unchanged, `phone: null` clears the phone, and `hours: null` removes the schedule.

`get_account_info` reads the documented V2 user profile. The original `find_locations`, users, and ping calls remain for compatibility, but their V2 routes are absent from the current reference. The documented V1 location route is `/api/locations` with a separate legacy token; `find_locations` retains its original `/api/v2/locations` call and is not a V1 client. Use the project tools for supported V2 location listing.

- [Current API reference](https://docs.storerocket.io/api/introduction)
- [Partial location updates](https://docs.storerocket.io/api/locations/update)
- [Official REST API guide](https://help.storerocket.io/en/articles/5579248-how-to-use-the-rest-api)
- [Official troubleshooting](https://help.storerocket.io/en/articles/14251872-rest-api-common-errors-and-how-to-fix-them)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
