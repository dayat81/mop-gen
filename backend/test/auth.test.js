const request = require('supertest');
const app = require('../app');

describe('Authentication Endpoints', () => {
  let registeredUser;

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser123',
        password: 'password123',
        email: 'test123@example.com'
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully');
    registeredUser = { username: 'testuser123', password: 'password123' };
  });

  it('should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser123', password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should return 401 with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser123', password: 'wrongpassword' });
    expect(response.status).toBe(401);
  });

  it('should return 400 if username is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });
    expect(response.status).toBe(400);
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser123' });
    expect(response.status).toBe(400);
  });
});