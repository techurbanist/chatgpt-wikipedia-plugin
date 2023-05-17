import * as MUT from '../static/functions/query/[[catchall]].js';

describe('[[catchall]].js', () => {

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

    it('should throw error when fetch fails', async () => {
      global.fetch = jest.fn(() => Promise.reject());
      await expect(MUT.fetchWikipediaPage('topic')).rejects.toEqual({
        message: "Error querying the Wikipedia API",
        status: 503,
        statusText: "Wikipedia Unavailable"
      });
    });

    it('should throw error when page is not found', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            query: {
              pages: {}
            }
          })
        })
      );
      await expect(MUT.fetchWikipediaPage('topic')).rejects.toThrow();
    });
  });

  describe('splitPageToParagraphs', () => {
    it('should split page text into paragraphs', () => {
      const pageText = 'paragraph1\n\nparagraph2\nparagraph3\n\nparagraph4';
      const result = MUT.splitPageToParagraphs(pageText);
      expect(result).toEqual(['paragraph1', 'paragraph2\nparagraph3', 'paragraph4']);
    });
  });

  describe('getMatchingParagraphs', () => {
    it('should get matching paragraphs sorted', () => {
      const paragraphs = ['paragraph0','paragraph1 term1', 'paragraph2 term1 term2', 'paragraph3', 'paragraph4'];
      const decodedQueries = ['term1', 'term2'];
      const result = MUT.getMatchingParagraphs(paragraphs, decodedQueries);
      expect(result).toEqual(['paragraph2 term1 term2', 'paragraph1 term1', 'paragraph0']);
    });
  });
});
