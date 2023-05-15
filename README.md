# Wikipedia ChatGPT Plugin

A plugin for ChatGPT which fetches the latest information on a specific topic from Wikipedia. 

The plugin will retrieve the Wikipedia page by title, index the content on the page for full text search and then return the top n paragraphs that match the search terms.

The plugin consists of:
* The plugin manifest and OpenAPI spec as required for all ChatGPT plugins
* A static `legal.html` webpage referenced in the plugin manifest  
* A CloudFlare Pages function and config, which provides the plugin API on the internet
* Shell scripts for running and deploying the CloudFlare Pages function and static assets

The plugin API is described in the `.well-known/openai.yaml` OpenAPI spec. The form is:
```
https://example.com/query/[page_title]/["search","terms"]
```
Where the `page_title` is the Wikipedia page title and the `search terms` are the words to find in the Wikipedia page.


## Development

Use [CloudFlare Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) for local development and deployments.

```bash
npm install wrangler
```

To develop the CloudFlare Function locally:
```bash
npm run develop
``` 

Call your local development API like this:
`http://127.0.0.1:8788/query/Cessna 152/["cruise speed","speed"]`


Run unit tests:
```bash
npm run test
```


## Deployment

You must set a `CLOUDFLARE_ACCOUNT_ID` env variable to deploy the function using the shell script.

Run `npm run publish` to deploy the CloudFlare Pages project.

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)

