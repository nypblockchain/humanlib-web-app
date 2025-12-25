// server.js - Backend server with manual sync only
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const admin = require('firebase-admin');

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Firebase Admin Configuration
const serviceAccount = require('./serviceAccountKey.json');

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
  // Create students table (unchanged)
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
    if (err) console.error('Error creating students table:', err);
  });

  // Drop existing sync_status table and create new one
  db_sql.run('DROP TABLE IF EXISTS sync_status', (err) => {
    if (err) {
      console.error('Error dropping sync_status:', err);
    } else {
      console.log('Dropped old sync_status table');
    }
    
    // Create new sync_status table with all columns
    db_sql.run(`
      CREATE TABLE sync_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
        sync_type TEXT,
        status TEXT,
        records_count INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Error creating sync_status table:', err);
      } else {
        console.log('Created new sync_status table with all columns');
      }
    });
  });
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

// Get students from Firebase
async function getStudentsFromFirebase() {
  try {
    const snapshot = await db_firebase.collection('students').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching from Firebase:', error);
    throw error;
  }
}

// Sync Firebase to SQLite (manual only)
async function syncFirebaseToSQL() {
  try {
    console.log('Starting manual Firebase to SQLite sync...');
    
    const snapshot = await db_firebase.collection('students').get();
    let syncedCount = 0;

    // Clear existing data
    await new Promise((resolve, reject) => {
      db_sql.run('DELETE FROM students', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      const stmt = db_sql.prepare(`
        INSERT INTO students 
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
      INSERT INTO sync_status (last_sync, sync_type, status, records_count)
      VALUES (CURRENT_TIMESTAMP, 'firebase_to_sql', 'success', ?)
    `, [syncedCount]);

    console.log(`Synced ${syncedCount} students from Firebase to SQLite`);
    return syncedCount;
  } catch (error) {
    console.error('Error syncing Firebase to SQLite:', error);
    db_sql.run(`
      INSERT INTO sync_status (last_sync, sync_type, status, records_count)
      VALUES (CURRENT_TIMESTAMP, 'firebase_to_sql', 'failed', 0)
    `);
    throw error;
  }
}

// API ROUTES

// Get students from LOCAL SQL only
app.get('/api/students', async (req, res) => {
  try {
    const students = await getStudentsFromSQL();
    
    res.json({
      students,
      source: 'sql'
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch students',
      message: error.message 
    });
  }
});

// Get Firebase data for comparison panel
app.get('/api/students/firebase', async (req, res) => {
  try {
    const students = await getStudentsFromFirebase();
    
    res.json({
      students,
      source: 'firebase'
    });
  } catch (error) {
    console.error('Error fetching Firebase students:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Firebase students',
      message: error.message 
    });
  }
});

// Add student - writes to FIREBASE only, local stays unchanged until manual sync
app.post('/api/students', async (req, res) => {
  try {
    const studentData = req.body;
    
    // Write to Firebase only
    const docRef = await db_firebase.collection('students').add(studentData);
    
    console.log(`Added student ${studentData.name} to Firebase only (ID: ${docRef.id})`);

    res.json({ 
      success: true, 
      id: docRef.id,
      message: 'Student added to Firebase. Click "Refresh Database" to update local view.'
    });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ 
      error: 'Failed to add student',
      message: error.message 
    });
  }
});

// Update student - writes to FIREBASE only
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const studentData = req.body;

    // Update Firebase only
    await db_firebase.collection('students').doc(id).update(studentData);
    
    console.log(`Updated student in Firebase: ${id}`);

    res.json({ 
      success: true,
      message: 'Student updated in Firebase. Click "Refresh Database" to update local view.'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ 
      error: 'Failed to update student',
      message: error.message 
    });
  }
});

// Delete student - deletes from FIREBASE only
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from Firebase only
    await db_firebase.collection('students').doc(id).delete();
    
    console.log(`Deleted student from Firebase: ${id}`);

    res.json({ 
      success: true,
      message: 'Student deleted from Firebase. Click "Refresh Database" to update local view.'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      error: 'Failed to delete student',
      message: error.message 
    });
  }
});

// Manual sync endpoint - refreshes local DB from Firebase
app.post('/api/sync', async (req, res) => {
  try {
    const count = await syncFirebaseToSQL();
    
    res.json({ 
      success: true, 
      message: `Successfully synced ${count} students from Firebase to local database`,
      count
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message 
    });
  }
});

// Get last sync info
app.get('/api/sync/status', async (req, res) => {
  try {
    db_sql.get(
      'SELECT * FROM sync_status ORDER BY last_sync DESC LIMIT 1',
      [],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json(row || { message: 'No sync history' });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const localStudents = await getStudentsFromSQL();
    
    // Try to check Firebase
    let firebaseStatus = 'unknown';
    let firebaseCount = 0;
    try {
      const firebaseStudents = await getStudentsFromFirebase();
      firebaseStatus = 'connected';
      firebaseCount = firebaseStudents.length;
    } catch (error) {
      firebaseStatus = 'disconnected';
    }
    
    res.json({
      status: 'ok',
      firebase: firebaseStatus,
      database: 'sqlite',
      localCount: localStudents.length,
      firebaseCount: firebaseCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('-----------------------------------------------');
  console.log('Human Library Server Started (Manual Sync Mode)');
  console.log('-----------------------------------------------');
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database: SQLite (local) + Firebase (remote)`);
  console.log(`Mode: Write to Firebase, Read from SQLite`);
  console.log(`Sync: Manual only via admin panel`);
  console.log('-----------------------------------------------');
});

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