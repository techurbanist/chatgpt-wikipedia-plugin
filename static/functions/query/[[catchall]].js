const RETURN_PARAGRAPH_LIMIT = 5; 
const MAX_SEARCH_TERMS = 4; // Max number of search terms to allow
const PARAGRAPH_CHAR_LIMIT = 500;  // If a paragraph is longer than this, split it into multiple paragraphs
const LOGGING = false;

/*
 * Request handler for Cloudflare Pages Functions
 */
export async function onRequest(context) {
  try {
    const {decodedTopic, decodedQueries} = extractArgs(context);
    const pageText = await fetchWikipediaPage(decodedTopic);
    const paragraphs = splitPageToParagraphs(pageText);
    const matchingParagraphs = getMatchingParagraphs(paragraphs, decodedQueries);

    const encodedTitle = encodeURIComponent(decodedTopic);
    const url = `https://en.wikipedia.org/wiki/${encodedTitle}`;

    return new Response(JSON.stringify({pageUrl: url, matches: matchingParagraphs}), {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      }
    });
  } catch (error) {
    return new Response(error.message, {status: error.status, statusText: error.statusText});
  }
}


export function extractArgs(context) {
  let topic, query;
  try {
    ({ catchall: [topic, query] } = context.params);
  } catch (e) {
    if (LOGGING) console.log(e);
    throw {message: "Invalid page or searchTerms parameters in the URL", status: 400, statusText: "Bad Request"};
  }

  let decodedTopic, decodedQuery;
  try {
    decodedTopic = decodeURIComponent(topic);
    decodedQuery = decodeURIComponent(query);
  } catch (e) {
    if (LOGGING) console.log(e);
    throw {message: "Invalid page or searchTerms parameters", status: 400, statusText: "Bad Request"};
  }

  let decodedQueries;
  try {
    decodedQueries = JSON.parse(decodedQuery)
  } catch (e) {
    if (LOGGING) console.log(e);
    throw {message: "searchTerms is not a valid stringified JSON array of search terms", status: 400, statusText: "Bad Request"};
  }

  if (!Array.isArray(decodedQueries)) {
    throw {message: "searchTerms is not an array", status: 400, statusText: "Bad Request"};
  }

  if (decodedQueries.length > MAX_SEARCH_TERMS) {
    throw {message: MAX_SEARCH_TERMS + " searchTerms exceeded in array", status: 400, statusText: "Bad Request"};
  }

  if(LOGGING) console.log(`Searching for ${decodedQuery} in ${decodedTopic}`);
  
  return {decodedTopic, decodedQueries};
}


export async function fetchWikipediaPage(decodedTopic){
  let response, data;
  try {
    response = await fetch(`https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&explaintext&redirects=1&titles=${decodedTopic}`);
    data = await response.json();
  } catch (e) {
    if (LOGGING) console.log(e);
    throw {message: "Error querying the Wikipedia API", status: 503, statusText: "Wikipedia Unavailable"};
  }

  const pageId = Object.keys(data.query.pages)[0];
  const pageText = data.query.pages[pageId].extract;

  if (LOGGING) console.log(`Page text is ${pageText}`);

  if (pageText === undefined) {
    throw {message: `Page with title '${decodedTopic}' was not found on Wikipedia. Check that you used title case or try another title.`, status: 200, statusText: "Page not found"};
  }
  return pageText;
}


export function splitPageToParagraphs(pageText){
  let paragraphs = pageText.split('\n\n').flatMap(para => {
    if (para.length > PARAGRAPH_CHAR_LIMIT) {
      return para.split('\n'); 
    } else {
      return para;
    }
  });
  return paragraphs;
}


export function getMatchingParagraphs(paragraphs, decodedQueries) {
  // Map paragraphs to objects that include the paragraph and its count
  const paragraphsAndCounts = paragraphs.map((paragraph, index) => {
    let count = 0;
    decodedQueries.forEach(query => {
      // Split query into words
      const words = query.split(' ');
      words.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = paragraph.match(regex);
        if (matches) {
          count += matches.length;
        }
      });
      // If the entire query matches, give a higher rating
      const queryRegex = new RegExp('\\b' + query, 'gi');
      const queryMatches = paragraph.match(queryRegex);
      if (queryMatches) {
        count += queryMatches.length;
      }
    });
    return { paragraph, count };
  });

  // Sort and filter the paragraphs by count
  const matchingParagraphs = paragraphsAndCounts
    .sort((a, b) => b.count - a.count)
    .filter(({ count }) => count > 0)
    .slice(0, RETURN_PARAGRAPH_LIMIT)
    .map(({ paragraph }) => paragraph);

  // add the first para for context if results are limited
  if(matchingParagraphs.length < RETURN_PARAGRAPH_LIMIT) {
    matchingParagraphs.push(paragraphs[0])
  }

  return matchingParagraphs;
}

