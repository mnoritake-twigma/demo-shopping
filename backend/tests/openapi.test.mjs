import test from 'node:test';
import assert from 'node:assert/strict';
import { createShop } from '../shared/shop.mjs';

for (const [backend, cookieName] of [['nestjs-prisma', 'pulse_native'], ['payload', 'pulse_payload']]) {
  test(`${backend}: OpenAPI is available without DB/session access and describes all Shop operations`, async () => {
    const repository = new Proxy({}, { get() { throw new Error('Documentation must not access DB'); } });
    const shop = createShop(repository, { backend, cookieName });
    const result = await shop.handle({ method: 'GET', url: '/openapi.json' });
    assert.equal(result.status, 200);
    const spec = result.body;
    assert.equal(spec.openapi, '3.0.3');
    assert.equal(spec.components.securitySchemes.sessionCookie.name, cookieName);
    assert.equal(spec.paths['/health'].get.responses[200].content['application/json'].schema.properties.backend.enum[0], backend);
    const operations = Object.values(spec.paths).flatMap(path => Object.entries(path).filter(([key]) => ['get', 'post', 'put', 'delete'].includes(key)).map(([,value]) => value));
    assert.equal(operations.length, 11);
    assert.equal(new Set(operations.map(op => op.operationId)).size, 11);
    assert.deepEqual(spec.paths['/cart'].get.security, [{ sessionCookie: [] }]);
    assert.deepEqual(spec.paths['/products'].get.security, []);
    assert.equal(spec.paths['/cart/items/{productId}'].put.requestBody.content['application/json'].schema.additionalProperties, false);
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (value.$ref) assert.ok(spec.components.schemas[value.$ref.split('/').at(-1)], value.$ref);
      Object.values(value).forEach(walk);
    };
    walk(spec);
    for (const base of ['http://localhost:8080/api/openapi.json', 'http://localhost:3002/shop-api/openapi.json']) {
      assert.equal(new URL(spec.servers[0].url, base).pathname, new URL('.', base).pathname);
    }
  });
}
