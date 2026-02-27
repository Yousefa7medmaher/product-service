import request from 'supertest';
import { configureApp } from '../src/server.js';

describe('Health & Ready endpoints', () => {
    let app;
    beforeAll(() => {
        app = configureApp();
    });

    test('GET /health should return 200', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('GET /ready should return 503 or 200', async () => {
        const res = await request(app).get('/ready');
        expect([200, 503]).toContain(res.statusCode);
    });
});