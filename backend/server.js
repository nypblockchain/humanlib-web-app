// server.js - Backend server for Firebase to SQL synchronization
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const admin = require('firebase-admin');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Configuration - Load from serviceAccountKey.json file
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db_firebase = admin.firestore();

// Initialize SQLite Database
const db_sql = new sqlite3.Database('./humanlib.db', (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Create tables if they don't exist
function initializeDatabase() {
  db_sql.run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      course TEXT,
      year TEXT,
      category TEXT,
      numberOfDays INTEGER,
      achievements TEXT,
      shifts TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating students table:', err);
    } else {
      console.log('Students table ready');
    }
  });

  db_sql.run(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync DATETIME,
      sync_type TEXT,
      status TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating sync_status table:', err);
    } else {
      console.log('Sync status table ready');
    }
  });
}

// Track connection status
let isFirebaseAvailable = true;
let lastFirebaseCheck = Date.now();
const FIREBASE_CHECK_INTERVAL = 10000; // Check every 10 seconds

// Check Firebase connectivity
async function checkFirebaseConnection() {
  try {
    // Try to read a document to verify connection
    await db_firebase.collection('students').limit(1).get();
    if (!isFirebaseAvailable) {
      console.log('Firebase connection restored');
    }
    isFirebaseAvailable = true;
    return true;
  } catch (error) {
    if (isFirebaseAvailable) {
      console.error('Firebase connection lost:', error.message);
    }
    isFirebaseAvailable = false;
    return false;
  }
}

// Sync Firebase to SQLite
async function syncFirebaseToSQL() {
  try {
    console.log('Starting Firebase to SQLite sync...');
    
    const snapshot = await db_firebase.collection('students').get();
    let syncedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      const stmt = db_sql.prepare(`
        INSERT OR REPLACE INTO students 
        (id, name, avatar, course, year, category, numberOfDays, achievements, shifts, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        doc.id,
        data.name,
        data.avatar || '',
        data.course || '',
        data.year || '',
        data.category || '',
        data.numberOfDays || 1,
        JSON.stringify(data.achievements || []),
        JSON.stringify(data.shifts || [])
      );

      stmt.finalize();
      syncedCount++;
    }

    // Record sync status
    db_sql.run(`
      INSERT INTO sync_status (last_sync, sync_type, status)
      VALUES (CURRENT_TIMESTAMP, 'firebase_to_sql', 'success')
    `);

    console.log(`Synced ${syncedCount} students from Firebase to SQLite`);
    return syncedCount;
  } catch (error) {
    console.error('Error syncing Firebase to SQLite:', error);
    db_sql.run(`
      INSERT INTO sync_status (last_sync, sync_type, status)
      VALUES (CURRENT_TIMESTAMP, 'firebase_to_sql', 'failed')
    `);
    throw error;
  }
}

// Get students from SQLite
function getStudentsFromSQL() {
  return new Promise((resolve, reject) => {
    db_sql.all('SELECT * FROM students ORDER BY name', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const students = rows.map(row => ({
          id: row.id,
          name: row.name,
          avatar: row.avatar,
          course: row.course,
          year: row.year,
          category: row.category,
          numberOfDays: row.numberOfDays,
          achievements: JSON.parse(row.achievements || '[]'),
          shifts: JSON.parse(row.shifts || '[]')
        }));
        resolve(students);
      }
    });
  });
}

// Sync local-only students to Firebase when connection is restored
async function syncLocalToFirebase() {
  try {
    const students = await getStudentsFromSQL();
    const localStudents = students.filter(s => s.id.startsWith('local_'));
    
    if (localStudents.length === 0) return 0;

    console.log(`Syncing ${localStudents.length} local students to Firebase...`);
    let syncedCount = 0;

    for (const student of localStudents) {
      try {
        // Create new document in Firebase
        const { id, ...studentData } = student;
        const docRef = await db_firebase.collection('students').add(studentData);
        
        // Update local record with Firebase ID
        db_sql.run(`
          UPDATE students SET id = ? WHERE id = ?
        `, [docRef.id, id]);

        syncedCount++;
        console.log(`Synced local student ${student.name} to Firebase`);
      } catch (error) {
        console.error(`Failed to sync student ${student.name}:`, error.message);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('Error syncing local to Firebase:', error);
    return 0;
  }
}

// API ROUTES

// Get all students (auto-detects source)
app.get('/api/students', async (req, res) => {
  try {
    // Check if enough time has passed since last Firebase check
    if (Date.now() - lastFirebaseCheck > FIREBASE_CHECK_INTERVAL) {
      await checkFirebaseConnection();
      lastFirebaseCheck = Date.now();
    }

    if (isFirebaseAvailable) {
      try {
        // Try to sync from Firebase first
        await syncFirebaseToSQL();
        
        // Also sync any local-only records to Firebase
        await syncLocalToFirebase();
        
        // Then read from SQLite
        const students = await getStudentsFromSQL();
        
        res.json({
          students,
          source: 'firebase',
          lastSync: new Date().toISOString()
        });
      } catch (error) {
        console.error('Firebase read failed, falling back to SQLite');
        isFirebaseAvailable = false;
        
        // Fallback to SQLite
        const students = await getStudentsFromSQL();
        res.json({
          students,
          source: 'sql',
          note: 'Using cached data from SQLite'
        });
      }
    } else {
      // Use SQLite directly
      const students = await getStudentsFromSQL();
      res.json({
        students,
        source: 'sql',
        note: 'Firebase unavailable, using SQLite cache'
      });
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch students',
      message: error.message 
    });
  }
});

// Add student (writes to both Firebase and SQLite)
app.post('/api/students', async (req, res) => {
  try {
    const studentData = req.body;
    
    // Try Firebase first
    if (isFirebaseAvailable) {
      try {
        const docRef = await db_firebase.collection('students').add(studentData);
        studentData.id = docRef.id;
        
        // Also save to SQLite
        const stmt = db_sql.prepare(`
          INSERT INTO students 
          (id, name, avatar, course, year, category, numberOfDays, achievements, shifts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          docRef.id,
          studentData.name,
          studentData.avatar || '',
          studentData.course || '',
          studentData.year || '',
          studentData.category || '',
          studentData.numberOfDays || 1,
          JSON.stringify(studentData.achievements || []),
          JSON.stringify(studentData.shifts || [])
        );

        stmt.finalize();

        console.log(`Added student ${studentData.name} to Firebase and SQLite`);

        res.json({ 
          success: true, 
          id: docRef.id,
          source: 'firebase'
        });
      } catch (error) {
        console.error('Firebase write failed, saving to SQLite only');
        isFirebaseAvailable = false;
        throw error; // Fall through to SQLite-only save
      }
    }
    
    if (!isFirebaseAvailable) {
      // Save to SQLite only
      const id = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const stmt = db_sql.prepare(`
        INSERT INTO students 
        (id, name, avatar, course, year, category, numberOfDays, achievements, shifts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        studentData.name,
        studentData.avatar || '',
        studentData.course || '',
        studentData.year || '',
        studentData.category || '',
        studentData.numberOfDays || 1,
        JSON.stringify(studentData.achievements || []),
        JSON.stringify(studentData.shifts || [])
      );

      stmt.finalize();

      console.log(`Added student ${studentData.name} to SQLite only (offline)`);

      res.json({ 
        success: true, 
        id,
        source: 'sql',
        note: 'Saved locally, will sync to Firebase when connection is restored'
      });
    }
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ 
      error: 'Failed to add student',
      message: error.message 
    });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const studentData = req.body;

    // Try Firebase first (only if not a local-only record)
    if (isFirebaseAvailable && !id.startsWith('local_')) {
      try {
        await db_firebase.collection('students').doc(id).update(studentData);
        console.log(`Updated student in Firebase: ${id}`);
      } catch (error) {
        console.error('Firebase update failed:', error.message);
        isFirebaseAvailable = false;
      }
    }

    // Always update SQLite
    const stmt = db_sql.prepare(`
      UPDATE students 
      SET name=?, avatar=?, course=?, year=?, category=?, 
          numberOfDays=?, achievements=?, shifts=?, last_updated=CURRENT_TIMESTAMP
      WHERE id=?
    `);

    stmt.run(
      studentData.name,
      studentData.avatar || '',
      studentData.course || '',
      studentData.year || '',
      studentData.category || '',
      studentData.numberOfDays || 1,
      JSON.stringify(studentData.achievements || []),
      JSON.stringify(studentData.shifts || []),
      id
    );

    stmt.finalize();

    console.log(`Updated student in SQLite: ${id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ 
      error: 'Failed to update student',
      message: error.message 
    });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try Firebase first (only if not a local-only record)
    if (isFirebaseAvailable && !id.startsWith('local_')) {
      try {
        await db_firebase.collection('students').doc(id).delete();
        console.log(`Deleted student from Firebase: ${id}`);
      } catch (error) {
        console.error('Firebase delete failed:', error.message);
        isFirebaseAvailable = false;
      }
    }

    // Always delete from SQLite
    db_sql.run('DELETE FROM students WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('SQLite delete failed:', err);
      } else {
        console.log(`Deleted student from SQLite: ${id}`);
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      error: 'Failed to delete student',
      message: error.message 
    });
  }
});

// Manual sync endpoint
app.post('/api/sync', async (req, res) => {
  try {
    await checkFirebaseConnection();
    
    if (isFirebaseAvailable) {
      const firebaseToSqlCount = await syncFirebaseToSQL();
      const localToFirebaseCount = await syncLocalToFirebase();
      
      res.json({ 
        success: true, 
        message: `Synced ${firebaseToSqlCount} from Firebase, ${localToFirebaseCount} local records to Firebase`,
        source: 'firebase'
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Firebase not available - check your connection',
        source: 'sql'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  await checkFirebaseConnection();
  
  const localStudents = await getStudentsFromSQL();
  const pendingSync = localStudents.filter(s => s.id.startsWith('local_')).length;
  
  res.json({
    status: 'ok',
    firebase: isFirebaseAvailable ? 'connected' : 'disconnected',
    database: 'sqlite',
    pendingSync: pendingSync,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('-----------------------------------------------');
  console.log('Human Library Server Started');
  console.log('-----------------------------------------------');
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database: SQLite + Firebase Firestore`);
  console.log(`Auto-sync interval: 30 seconds`);
  console.log('-----------------------------------------------');
  
  // Initial Firebase check and sync
  checkFirebaseConnection().then(async (available) => {
    if (available) {
      console.log('Firebase connected, performing initial sync...');
      const count = await syncFirebaseToSQL();
      const localCount = await syncLocalToFirebase();
      console.log(`Initial sync complete: ${count} students from Firebase`);
      if (localCount > 0) {
        console.log(`Synced ${localCount} local records to Firebase`);
      }
    } else {
      console.log('Firebase unavailable, using SQLite only mode');
      console.log('Data will sync automatically when connection returns');
    }
  });
});

// Periodic Firebase check and sync (every 30 seconds if Firebase is available)
setInterval(async () => {
  if (isFirebaseAvailable) {
    try {
      await syncFirebaseToSQL();
      await syncLocalToFirebase();
    } catch (error) {
      console.error('Periodic sync failed:', error.message);
    }
  } else {
    // Periodically try to reconnect
    await checkFirebaseConnection();
  }
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db_sql.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database closed');
    }
    process.exit(0);
  });
});