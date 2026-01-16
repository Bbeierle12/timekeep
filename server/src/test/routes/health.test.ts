import { describe, it, expect } from 'vitest';
import { testRequest } from '../helpers';

describe('Health Check', () => {
  it('GET /health returns ok status', async () => {
    const response = await testRequest.get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
