// MongoDB initialization script
db = db.getSiblingDB('venue_booking_dev');

// Create collections with validation
db.createCollection('venues', {
  validator: {
    $and: [
      { name: { $type: 'string', $exists: true } },
      { location: { $type: 'object', $exists: true } },
      { capacity: { $type: 'object', $exists: true } },
      { pricing: { $type: 'object', $exists: true } },
      { verified: { $type: 'bool', $exists: true } }
    ]
  }
});

db.createCollection('bookings', {
  validator: {
    $and: [
      { venueId: { $type: 'string', $exists: true } },
      { contactEmail: { $type: 'string', $exists: true } },
      { date: { $type: 'date', $exists: true } },
      { status: { $in: ['pending', 'confirmed', 'cancelled', 'completed'] } }
    ]
  }
});

db.createCollection('sessions', {
  validator: {
    $and: [
      { sessionId: { $type: 'string', $exists: true } },
      { createdAt: { $type: 'date', $exists: true } }
    ]
  }
});

db.createCollection('audit_logs', {
  validator: {
    $and: [
      { action: { $type: 'string', $exists: true } },
      { timestamp: { $type: 'date', $exists: true } },
      { level: { $in: ['info', 'warn', 'error', 'debug'] } }
    ]
  }
});

// Create indexes for performance
db.venues.createIndex({ 'location.city': 1, capacity: 1 });
db.venues.createIndex({ verified: 1, rating: -1 });
db.venues.createIndex({ 'location.coordinates': '2dsphere' });

db.bookings.createIndex({ venueId: 1, date: 1 });
db.bookings.createIndex({ contactEmail: 1, status: 1 });
db.bookings.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL

db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ level: 1, timestamp: -1 });
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Create development user
db.createUser({
  user: 'dev_user',
  pwd: 'dev_password',
  roles: [
    { role: 'readWrite', db: 'venue_booking_dev' },
    { role: 'read', db: 'venue_booking_test' }
  ]
});

print('Database initialization completed successfully');
print('Collections created: venues, bookings, sessions, audit_logs');
print('Indexes created for optimal query performance');
print('Development user created with appropriate permissions');