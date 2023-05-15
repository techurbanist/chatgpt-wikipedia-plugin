import * as MUT from '../static/functions/query/[[catchall]].js';
import fs from 'fs';
import path from 'path';

// Mock only the fetch function
global.fetch = jest.fn();

global.Response = jest.fn((body, init) => ({
  ...init,
  json: () => Promise.resolve(JSON.parse(body)),
  text: () => Promise.resolve(body),
  headers: {
    get: (headerName) => init.headers[headerName],
  },
}));

// Helper function to setup the fetch mock with a given filename
function setupFetchMock(filename) {
  const mockText = fs.readFileSync(path.resolve(__dirname, '__mocks__', filename), 'utf-8');
  global.fetch.mockImplementationOnce(() =>
    Promise.resolve({
      json: () => Promise.resolve({
        query: {
          pages: {
            "1": {
              extract: mockText
            }
          }
        }
      })
    })
  );
}

describe('[[catchall]].js End-to-End', () => {
  it('onRequest returns matching paragraphs from Wikipedia page', async () => {
    // Arrange
    const context = {
      params: {
        catchall: ['Twitter', '["CEO"]']
      }
    };
    setupFetchMock('test-page-twitter.txt');

    // Act
    const response = await MUT.onRequest(context);

    // Assert
    const json = await response.json();
    expect(response.headers.get('content-type')).toBe('application/json;charset=UTF-8');
    expect(json.matches).toBeDefined();
    json.matches.forEach(match => {
      expect(match).toContain('CEO');
    });
  });

  it('onRequest returns matching paragraphs from another Wikipedia page', async () => {
    // Arrange
    const context = {
      params: {
        catchall: ['2022 Booker Prize', '["winner"]']
      }
    };
    setupFetchMock('test-page-2022-book-prize.txt');

    // Act
    const response = await MUT.onRequest(context);

    // Assert
    const json = await response.json();
    expect(response.headers.get('content-type')).toBe('application/json;charset=UTF-8');
    expect(json.matches).toBeDefined();
    expect(json.matches.length).toBe(2);
    expect(json.matches[0]).toContain('winner');
  });
});
