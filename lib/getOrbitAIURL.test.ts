import { describe, it, expect } from 'vitest';
import { getOrbitAIURL } from './getOrbitAIURL';

describe('getOrbitAIURL', () => {
  it('returns the original URL if no region is provided', () => {
    const url = 'https://myproject.orbit.ai';
    expect(getOrbitAIURL(url, null)).toBe(url + '/');
  });

  it('inserts the region into orbit.ai URLs', () => {
    const url = 'https://myproject.orbit.ai';
    const region = 'eu';
    expect(getOrbitAIURL(url, region)).toBe('https://myproject.eu.production.orbit.ai/');
  });

  it('inserts the region into orbit.ai URLs and preserves the staging environment', () => {
    const url = 'https://myproject.staging.orbit.ai';
    const region = 'eu';
    expect(getOrbitAIURL(url, region)).toBe('https://myproject.eu.staging.orbit.ai/');
  });

  it('returns the original URL for non-orbit.ai hosts, even with region', () => {
    const url = 'https://example.com';
    const region = 'us';
    expect(getOrbitAIURL(url, region)).toBe(url + '/');
  });

  it('handles URLs with paths and query params', () => {
    const url = 'https://myproject.orbit.ai/room?foo=bar';
    const region = 'ap';
    expect(getOrbitAIURL(url, region)).toBe(
      'https://myproject.ap.production.orbit.ai/room?foo=bar',
    );
  });
});
