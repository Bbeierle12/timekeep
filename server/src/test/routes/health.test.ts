import { describe, it, expect } from 'vitest';
import { testRequest, mockPoolQuery, mockQueryResult } from '../helpers';

describe('Health Check', () => {
  it('GET /health returns ok status when DB is healthy', async () => {
    mockPoolQuery.mockResolvedValueOnce(mockQueryResult([{ '?column?': 1 }]));

    const response = await testRequest.get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.dependencies).toBeDefined();
    expect(response.body.dependencies.database.status).toBe('ok');
    expect(response.body.dependencies.database.latencyMs).toBeTypeOf('number');
  });

  it('GET /health returns 503 when DB is down', async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error('connection refused'));

    const response = await testRequest.get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.dependencies.database.status).toBe('error');
  });
});
