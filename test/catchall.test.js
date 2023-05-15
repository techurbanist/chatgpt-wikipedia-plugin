import * as MUT from '../static/functions/query/[[catchall]].js';
import { Index } from '../static/lib/flexsearch.js';

jest.mock('../static/lib/flexsearch.js');

describe('[[catchall]].js', () => {
  describe('extractArgs', () => {
    it('should extract arguments from context', () => {
      const context = {
        params: {
          catchall: ['topic', '["query1", "query2"]']
        }
      };
      const result = MUT.extractArgs(context);
      expect(result).toEqual({ decodedTopic: 'topic', decodedQueries: ['query1', 'query2'] });
    });

    it('should throw error when context is not valid', () => {
      const context = {
        params: {
          catchall: ['topic', 'not a json string']
        }
      };
      expect(() => MUT.extractArgs(context)).toThrow();
    });
  });

  describe('fetchWikipediaPage', () => {
    it('should fetch Wikipedia page', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            query: {
              pages: {
                123: {
                  extract: 'page text'
                }
              }
            }
          })
        })
      );

      const result = await MUT.fetchWikipediaPage('topic');
      expect(result).toEqual('page text');
    });
  });

  describe('splitPageToParagraphs', () => {
    it('should split page text into paragraphs', () => {
      const pageText = 'paragraph1\n\nparagraph2\nparagraph3\n\nparagraph4';
      const result = MUT.splitPageToParagraphs(pageText);
      expect(result).toEqual(['paragraph1', 'paragraph2\nparagraph3', 'paragraph4']);
    });
  });

  describe('getSearchIndex', () => {
    it('should get search index', () => {
      const paragraphs = ['paragraph1', 'paragraph2', 'paragraph3'];
      const index = MUT.getSearchIndex(paragraphs);
      expect(index).toBeInstanceOf(Index);
    });
  });

  describe('getMatchingParagraphs', () => {
    it('should get matching paragraphs', () => {
      const paragraphs = ['paragraph1', 'paragraph2', 'paragraph3'];
      const index = new Index();
      index.search = jest.fn(() => [0, 1, 2]);
      const decodedQueries = ['query1', 'query2'];
      const result = MUT.getMatchingParagraphs(paragraphs, index, decodedQueries);
      expect(result).toEqual(['paragraph1', 'paragraph2', 'paragraph3']);
    });
  });
});
