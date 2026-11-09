import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { cacheService } from '../src/cache/cacheService';
import { cdnSecurityService } from '../src/services/cdnSecurityService';
import { searchService } from '../src/search/searchService';
import { eventBus, DomainEvent } from '../src/events/eventBus';
import { generateHlsEncryptionKeyInfo } from '../src/worker/transcodeWorker';
import { registerAllSubscribers } from '../src/events/subscribers';
import { CourseSearchDocument } from '../src/search/searchInterface';

async function runEnterprisePhase1Tests() {
  console.log('\n===============================================================');
  console.log('🚀 EDUSPHERE ENTERPRISE UPGRADES PHASE 1: VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}`);
      throw err;
    }
  }

  // Register all event subscribers
  registerAllSubscribers();

  // ---------------------------------------------------------------------------
  // PILLAR 1: CACHING & READ SCALING (Cache-Aside + Tag Invalidation)
  // ---------------------------------------------------------------------------
  console.log('\n--- Pillar 1: High-Performance Cache-Aside & Tag Invalidation ---');

  await test('1. Cache-Aside: Set and retrieve cached payload', async () => {
    const key = 'test:course:101';
    const data = { id: 'course-101', title: 'Distributed Systems 101', price: 99 };

    await cacheService.set(key, data, { ttlSeconds: 60 });
    const cached = await cacheService.get<typeof data>(key);

    assert(cached, 'Expected cached data to be retrieved');
    assert.strictEqual(cached.id, 'course-101');
    assert.strictEqual(cached.title, 'Distributed Systems 101');
  });

  await test('2. Query Hashing: Generates deterministic sorted hash for queries', () => {
    const hashA = cacheService.hashQuery({ category: 'Backend', level: 'Advanced', page: 1 });
    const hashB = cacheService.hashQuery({ page: 1, level: 'Advanced', category: 'Backend' });

    assert.strictEqual(hashA, hashB, 'Different parameter order must generate identical query hashes');
  });

  await test('3. Tag-Based Invalidation: Invalidate all keys matching a specific tag', async () => {
    const key1 = 'test:catalog:query1';
    const key2 = 'test:catalog:query2';
    const key3 = 'test:user:profile1';

    await cacheService.set(key1, { res: 'cat1' }, { tags: ['courses:catalog'] });
    await cacheService.set(key2, { res: 'cat2' }, { tags: ['courses:catalog', 'category:devops'] });
    await cacheService.set(key3, { user: 'alice' }, { tags: ['users'] });

    // Invalidate courses catalog tag
    await cacheService.invalidateByTag('courses:catalog');

    const res1 = await cacheService.get(key1);
    const res2 = await cacheService.get(key2);
    const res3 = await cacheService.get(key3);

    assert.strictEqual(res1, null, 'Tagged key 1 should have been evicted');
    assert.strictEqual(res2, null, 'Tagged key 2 should have been evicted');
    assert(res3 !== null, 'Untagged key 3 must remain intact in cache');
  });

  // ---------------------------------------------------------------------------
  // PILLAR 2: VIDEO STREAMING & DRM ENCRYPTION ARCHITECTURE
  // ---------------------------------------------------------------------------
  console.log('\n--- Pillar 2: Video Streaming, AES-128 DRM & Signed CDN ---');

  await test('4. HLS AES-128 DRM: Transcode worker key info generation', async () => {
    const courseId = 'course-video-test';
    const lessonId = 'lesson-drm-1';

    const keyInfo = await generateHlsEncryptionKeyInfo(courseId, lessonId);

    assert(keyInfo.keyPath, 'Key file path must be generated');
    assert(fs.existsSync(keyInfo.keyPath), 'Key file must physically exist on disk');
    assert.strictEqual(keyInfo.keyBytes.length, 16, 'AES-128 key must be exactly 16 bytes');
    assert.strictEqual(keyInfo.ivHex.length, 32, 'IV hex must be 32 characters (16 bytes)');
    assert(keyInfo.keyUri.includes(`/api/media/hls-key/${courseId}/${lessonId}`), 'Key URI must point to licensing endpoint');

    // Clean up temporary files
    try {
      if (fs.existsSync(keyInfo.keyInfoPath)) fs.unlinkSync(keyInfo.keyInfoPath);
      if (fs.existsSync(keyInfo.keyPath)) fs.unlinkSync(keyInfo.keyPath);
    } catch {}
  });

  await test('5. CDN Security Service: Signed token generation and verification', () => {
    const courseId = 'crs-sec-1';
    const lessonId = 'les-sec-1';

    const token = cdnSecurityService.generatePlaybackToken(courseId, lessonId, 60);
    assert(token && token.length > 20, 'Expected valid signed HMAC token');

    const isValid = cdnSecurityService.verifyPlaybackToken(courseId, lessonId, token);
    assert.strictEqual(isValid, true, 'Valid token must be verified successfully');

    // Tampered token check
    const tamperedToken = token.slice(0, -4) + 'abcd';
    const isTamperedValid = cdnSecurityService.verifyPlaybackToken(courseId, lessonId, tamperedToken);
    assert.strictEqual(isTamperedValid, false, 'Tampered token must fail verification');

    // Wrong lesson check
    const wrongLessonValid = cdnSecurityService.verifyPlaybackToken(courseId, 'les-wrong', token);
    assert.strictEqual(wrongLessonValid, false, 'Token bound to another lesson must fail verification');
  });

  await test('6. CDN Security Service: Generate full signed playback URL', () => {
    const signedUrl = cdnSecurityService.generateSignedPlaybackUrl({
      courseId: 'crs-99',
      lessonId: 'les-99',
      validMinutes: 120,
    });

    assert(signedUrl.includes('/hls/crs-99/les-99/master.m3u8'), 'Must include correct HLS master playlist path');
    assert(signedUrl.includes('token='), 'Must include HMAC signature token');
    assert(signedUrl.includes('expires='), 'Must include expiry timestamp');
  });

  // ---------------------------------------------------------------------------
  // PILLAR 3: DECOUPLED TYPO-TOLERANT FACETED SEARCH
  // ---------------------------------------------------------------------------
  console.log('\n--- Pillar 3: Decoupled Typo-Tolerant & Faceted Search ---');

  const testCourses: CourseSearchDocument[] = [
    {
      id: 'srch-c1',
      title: 'Python for Data Science and Machine Learning',
      slug: 'python-data-science',
      category: 'Data Science',
      level: 'Beginner',
      instructorName: 'Guido Rossum',
      institutionName: 'Stanford Academy',
      price: 49,
      rating: 4.8,
      ratingCount: 120,
      durationHours: 25,
      tags: ['python', 'pandas', 'numpy', 'scikit-learn'],
      isPublished: true,
      tenantId: null,
    },
    {
      id: 'srch-c2',
      title: 'Advanced Kubernetes and Cloud Native Architecture',
      slug: 'advanced-kubernetes',
      category: 'Cloud Computing',
      level: 'Advanced',
      instructorName: 'Kelsey Hightower',
      institutionName: 'Cloud Native Institute',
      price: 120,
      rating: 4.9,
      ratingCount: 350,
      durationHours: 40,
      tags: ['kubernetes', 'docker', 'helm', 'devops'],
      isPublished: true,
      tenantId: null,
    },
    {
      id: 'srch-c3',
      title: 'Free Web Development Fundamentals',
      slug: 'free-web-dev',
      category: 'Web Development',
      level: 'Beginner',
      instructorName: 'Tim Berners',
      institutionName: 'Open Web Consortium',
      price: 0,
      rating: 4.5,
      ratingCount: 50,
      durationHours: 10,
      tags: ['html', 'css', 'javascript'],
      isPublished: true,
      tenantId: null,
    },
  ];

  await test('7. Search Indexing: Ingest courses into search engine', async () => {
    for (const c of testCourses) {
      await searchService.indexCourse(c);
    }
    const result = await searchService.searchCourses({});
    assert(result.totalHits >= 3, `Expected at least 3 indexed courses, got ${result.totalHits}`);
  });

  await test('8. Facet Aggregations: Dynamic facet calculation for categories, levels, and price ranges', async () => {
    const result = await searchService.searchCourses({});
    assert(result.facets.categories['Data Science'] >= 1, 'Data Science facet must be counted');
    assert(result.facets.categories['Cloud Computing'] >= 1, 'Cloud Computing facet must be counted');
    assert(result.facets.levels['Beginner'] >= 2, 'Beginner level facet must be counted');
    assert(result.facets.priceRanges['Free (0)'] >= 1, 'Free tier facet must be counted');
    assert(result.facets.priceRanges['Over $100'] >= 1, 'Over $100 tier facet must be counted');
  });

  await test('9. Typo-Tolerant Search: Levenshtein distance matches intentional typos', async () => {
    // Search with intentional typo: "pythn" -> should match "Python for Data Science"
    const typoPyResult = await searchService.searchCourses({ query: 'pythn' });
    assert(typoPyResult.hits.length > 0, 'Typo "pythn" must find Python course');
    assert.strictEqual(typoPyResult.hits[0].id, 'srch-c1');

    // Search with intentional typo: "kubernets" -> should match "Kubernetes"
    const typoK8sResult = await searchService.searchCourses({ query: 'kubernets' });
    assert(typoK8sResult.hits.length > 0, 'Typo "kubernets" must find Kubernetes course');
    assert.strictEqual(typoK8sResult.hits[0].id, 'srch-c2');
  });

  await test('10. Faceted Filtering: Exact match by level, category, and price range', async () => {
    const filteredResult = await searchService.searchCourses({
      category: 'Cloud Computing',
      level: 'Advanced',
      minPrice: 100,
    });

    assert.strictEqual(filteredResult.hits.length, 1);
    assert.strictEqual(filteredResult.hits[0].id, 'srch-c2');
  });

  // ---------------------------------------------------------------------------
  // PILLAR 4: MONOLITH TO EVENT-DRIVEN ARCHITECTURE (Event Bus & Subscribers)
  // ---------------------------------------------------------------------------
  console.log('\n--- Pillar 4: Event-Driven Event Bus & Asynchronous Decoupling ---');

  await test('11. Event Bus: Asynchronous publish and subscriber delivery', async () => {
    let receivedEvent: DomainEvent | null = null;

    eventBus.subscribe('TEST_EVENT_DISPATCHED', (evt) => {
      receivedEvent = evt;
    });

    const published = await eventBus.publish('TEST_EVENT_DISPATCHED', 'agg-100', {
      greeting: 'Hello EduSphere Event Bus',
    });

    assert(published.eventId.startsWith('evt-'), 'Event ID must start with evt-');
    assert.strictEqual(published.aggregateId, 'agg-100');

    // Wait for setImmediate microtask
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert(receivedEvent !== null, 'Subscriber must have received dispatched event');
    assert.strictEqual((receivedEvent as any)?.payload?.greeting, 'Hello EduSphere Event Bus');
  });

  await test('12. Event Subscribers: End-to-end COURSE_ENROLLED event handling', async () => {
    // Set a course in cache
    const testCourseId = 'course-enroll-evt-1';
    await cacheService.set(`course:${testCourseId}`, { title: 'Test Evt Course' }, { tags: [`course:${testCourseId}`, 'courses:catalog'] });

    // Verify it is cached
    const beforeEvt = await cacheService.get(`course:${testCourseId}`);
    assert(beforeEvt !== null, 'Course must be cached initially');

    // Publish COURSE_ENROLLED
    await eventBus.publish('COURSE_ENROLLED', 'enr-999', {
      enrollmentId: 'enr-999',
      courseId: testCourseId,
      learnerId: 'learner-test-1',
      courseTitle: 'Test Evt Course',
      enrolledAt: new Date().toISOString(),
    });

    // Wait for setImmediate async subscriber execution
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Verify cache tag invalidation was triggered by the subscriber
    const afterEvt = await cacheService.get(`course:${testCourseId}`);
    assert.strictEqual(afterEvt, null, 'Cache tag for course must be evicted by enrollment subscriber');
  });

  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passed}/${total} ENTERPRISE PHASE 1 UPGRADE TESTS PASSED!`);
  console.log('===============================================================\n');
}

runEnterprisePhase1Tests().catch((err) => {
  console.error('\n❌ Enterprise Upgrade Suite Execution Aborted:', err);
  process.exit(1);
});
