import {Index} from '../../lib/flexsearch.js'

const RETURN_PARAGRAPH_LIMIT = 5; 
const SEARCH_RESULTS_LIMIT = 10; 
const MAX_SEARCH_TERMS = 4; // Max number of search terms to allow
const PARAGRAPH_CHAR_LIMIT = 500;  // If a paragraph is longer than this, split it into multiple paragraphs
const LOGGING = false;

/*
 * Request handler for Cloudflare Pages Functions
 */
export async function onRequest(context) {
  const {decodedTopic, decodedQueries} = extractArgs(context);
  const pageText = await fetchWikipediaPage(decodedTopic);
  const paragraphs = splitPageToParagraphs(pageText);
  const index = getSearchIndex(paragraphs);
  const matchingParagraphs = getMatchingParagraphs(paragraphs, index, decodedQueries);

  return new Response(JSON.stringify({matches: matchingParagraphs}), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    }
  });
}


export function extractArgs(context) {
  let topic, query;
  try {
    ({ catchall: [topic, query] } = context.params);
  } catch (e) {
    if (LOGGING) console.log(e);
    return new Response("Invalid page or searchTerms parameters in the URL", {status: 400, statusText: "Bad Request" });
  }

  let decodedTopic, decodedQuery;
  try {
    decodedTopic = decodeURIComponent(topic);
    decodedQuery = decodeURIComponent(query);
  } catch (e) {
    if (LOGGING) console.log(e);
    return new Response("Invalid page or searchTerms parameters", {status: 400, statusText: "Bad Request" });
  }

  let decodedQueries;
  try {
    decodedQueries = JSON.parse(decodedQuery)
  } catch (e) {
    if (LOGGING) console.log(e);
    return new Response("searchTerms is not a valid stringified JSON array of search terms", {status: 400, statusText: "Bad Request" });
  }

  if (!Array.isArray(decodedQueries)) {
    return new Response("searchTerms is not an array", {status: 400, statusText: "Bad Request" });
  }

  if (decodedQueries.length > MAX_SEARCH_TERMS) {
    return new Response(MAX_SEARCH_TERMS + " searchTerms exceeded in array", {status: 400, statusText: "Bad Request" });
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
    return new Response("Error querying Wikipedia", {status: 503, statusText: "Wikipedia Unavailable" });
  }

  const pageId = Object.keys(data.query.pages)[0];
  const pageText = data.query.pages[pageId].extract;

  if (pageText === undefined) {
    return new Response("Page not found on Wikipedia", {status: 404, statusText: "Page not found" });
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


export function getSearchIndex(paragraphs){
  const options = {
    charset: "latin",
    tokenize: 'forward',
    preset: "default",
    minlength: 3,
  }
  const index = new Index(options);

  paragraphs.forEach((paragraph, i) => {
    index.add(i, paragraph);
  });

  return index;
}


export function getMatchingParagraphs(paragraphs, index, decodedQueries){
  // Search the index for each query term, aggregate results
  const matchCounts = {}; 
  decodedQueries.forEach(decodedQuery => {
    const matches = index.search(decodedQuery, SEARCH_RESULTS_LIMIT);
    matchCounts[0] = 1; // Always include the first paragraph
    matches.forEach(match => {
      if (matchCounts[match] === undefined) {
        matchCounts[match] = 1;
      } else {
        matchCounts[match]++;
      }
    });
  });

  // Sort matches by count, then take top n
  const sortedMatches = Object.keys(matchCounts).sort((a, b) => matchCounts[b] - matchCounts[a]).slice(0, RETURN_PARAGRAPH_LIMIT);

  // Filter the paragraphs to only those that match
  const matchingParagraphs = sortedMatches.map(match => paragraphs[match]);

  return matchingParagraphs;
}