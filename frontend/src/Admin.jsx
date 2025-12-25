import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiYNFFyKmjhViYMo9YPPcZGSuNTqX2Ido",
  authDomain: "humanlib-e647f.firebaseapp.com",
  projectId: "humanlib-e647f",
  storageBucket: "humanlib-e647f.firebasestorage.app",
  messagingSenderId: "207013774871",
  appId: "1:207013774871:web:6a3e2524b6d7e0e4677e52",
  measurementId: "G-XN1WM6QKVX"
};

// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export default function AdminPanel() {
  const [localStudents, setLocalStudents] = useState([]);
  const [firebaseStudents, setFirebaseStudents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [activePanel, setActivePanel] = useState('local'); // 'local' or 'firebase'
  
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    course: '',
    year: '',
    achievement1: '',
    achievement2: '',
    achievement3: '',
    numberOfDays: '1',
    day1Date: '',
    day1Start: '',
    day1End: '',
    day2Date: '',
    day2Start: '',
    day2End: '',
    day3Date: '',
    day3Start: '',
    day3End: '',
    category: 'internships'
  });

  const categories = [
    { id: 'internships', label: 'Internships' },
    { id: 'overseas', label: 'Overseas Opportunities' },
    { id: 'professional', label: 'Professional Development' },
    { id: 'alumni', label: 'Alumni Progression' },
    { id: 'courses', label: 'Courses' }
  ];

  const courses = [
    'Applied AI & Analytics',
    'Business & Financial Technology',
    'Cybersecurity & Digital Forensics',
    'Information Technology',
    'Common Business & Technology Programme',
    'Common ICT Programme'
  ];

  const years = ['PFP', 'Year 1', 'Year 2', 'Year 3'];

  const dateOptions = [
    { value: '17/12/2025', label: '8 January' },
    { value: '09/01/2026', label: '9 January' },
    { value: '10/01/2026', label: '10 January' }
  ];

  const getAvailableDates = (currentDay) => {
    const selectedDates = [];
    if (currentDay !== 1 && formData.day1Date) selectedDates.push(formData.day1Date);
    if (currentDay !== 2 && formData.day2Date) selectedDates.push(formData.day2Date);
    if (currentDay !== 3 && formData.day3Date) selectedDates.push(formData.day3Date);
    
    return dateOptions.filter(option => !selectedDates.includes(option.value));
  };

  const getAvailableEndTimes = (startTime) => {
    if (!startTime) return timeOptions;
    const startIndex = timeOptions.indexOf(startTime);
    return timeOptions.slice(startIndex + 1);
  };
        
  // Generate time options (0:00 to 22:30 in 15-minute intervals)
  const generateTimeOptions = () => {
    const times = [];
    const startHour = 0;
    const startMinute = 0;
    const endHour = 22;
    const endMinute = 30;

    for (let h = startHour; h <= endHour; h++) {
      const startMin = (h === startHour) ? startMinute : 0;
      const endMin = (h === endHour) ? endMinute : 45;
      
      for (let m = startMin; m <= endMin; m += 15) {
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        times.push(`${hour}:${min}`);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Fetch local SQL data from backend
  useEffect(() => {
    const fetchLocalStudents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/students`);
        const data = await response.json();
        setLocalStudents(data.students || []);
      } catch (error) {
        console.error('Error fetching local students:', error);
      }
    };

    fetchLocalStudents();
    const interval = setInterval(fetchLocalStudents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time listener for Firebase students
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFirebaseStudents(studentsData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch last sync status
  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sync/status`);
        const data = await response.json();
        setSyncStatus(data);
      } catch (error) {
        console.error('Error fetching sync status:', error);
      }
    };

    fetchSyncStatus();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    const numDays = parseInt(formData.numberOfDays);
    
    // Validate required fields
    if (!formData.name || !formData.course || !formData.year || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate shifts based on number of days
    if (numDays >= 1 && (!formData.day1Date || !formData.day1Start || !formData.day1End)) {
      alert('Please select date and times for Day 1');
      return;
    }
    if (numDays >= 2 && (!formData.day2Date || !formData.day2Start || !formData.day2End)) {
      alert('Please select date and times for Day 2');
      return;
    }
    if (numDays >= 3 && (!formData.day3Date || !formData.day3Start || !formData.day3End)) {
      alert('Please select date and times for Day 3');
      return;
    }
    
    const achievements = [
      formData.achievement1,
      formData.achievement2,
      formData.achievement3
    ].filter(a => a.trim() !== '');

    // Build shifts array based on number of days
    const shifts = [];
    if (numDays >= 1) {
      shifts.push({
        date: formData.day1Date,
        shiftStart: formData.day1Start,
        shiftEnd: formData.day1End
      });
    }
    if (numDays >= 2) {
      shifts.push({
        date: formData.day2Date,
        shiftStart: formData.day2Start,
        shiftEnd: formData.day2End
      });
    }
    if (numDays >= 3) {
      shifts.push({
        date: formData.day3Date,
        shiftStart: formData.day3Start,
        shiftEnd: formData.day3End
      });
    }

    const studentData = {
      name: formData.name,
      avatar: formData.avatar,
      course: formData.course,
      year: formData.year,
      achievements,
      numberOfDays: numDays,
      shifts,
      category: formData.category
    };

    try {
      if (isEditing) {
        // Update in Firebase only
        await updateDoc(doc(db, 'students', editingId), studentData);
        alert('Student updated in Firebase! Click "Refresh Database" to see changes in local view.');
      } else {
        // Add to Firebase only
        await addDoc(collection(db, 'students'), studentData);
        alert('Student added to Firebase! Click "Refresh Database" to see changes in local view.');
      }
      resetForm();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (student) => {
    const numDays = student.numberOfDays || 1;
    const shifts = student.shifts || [];
    
    setFormData({
      name: student.name,
      avatar: student.avatar,
      course: student.course,
      year: student.year,
      achievement1: student.achievements?.[0] || '',
      achievement2: student.achievements?.[1] || '',
      achievement3: student.achievements?.[2] || '',
      numberOfDays: numDays.toString(),
      day1Date: shifts[0]?.date || '',
      day1Start: shifts[0]?.shiftStart || '',
      day1End: shifts[0]?.shiftEnd || '',
      day2Date: shifts[1]?.date || '',
      day2Start: shifts[1]?.shiftStart || '',
      day2End: shifts[1]?.shiftEnd || '',
      day3Date: shifts[2]?.date || '',
      day3Start: shifts[2]?.shiftStart || '',
      day3End: shifts[2]?.shiftEnd || '',
      category: student.category
    });
    setEditingId(student.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student? This will delete from Firebase only.')) {
      try {
        // Delete from Firebase only
        await deleteDoc(doc(db, 'students', id));
        alert('Student deleted from Firebase! Click "Refresh Database" to update local view.');
      } catch (error) {
        alert('Error deleting student: ' + error.message);
      }
    }
  };

  const handleSync = async () => {
    if (!window.confirm('This will refresh the local database with data from Firebase. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✓ ${data.message}`);
        
        // Refresh sync status
        const statusResponse = await fetch(`${API_BASE_URL}/sync/status`);
        const statusData = await statusResponse.json();
        setSyncStatus(statusData);
        
        // Refresh local students
        const studentsResponse = await fetch(`${API_BASE_URL}/students`);
        const studentsData = await studentsResponse.json();
        setLocalStudents(studentsData.students || []);
      } else {
        alert('Sync failed: ' + data.message);
      }
    } catch (error) {
      alert('Error syncing: ' + error.message);
    }
    setSyncing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      avatar: '',
      course: '',
      year: '',
      achievement1: '',
      achievement2: '',
      achievement3: '',
      numberOfDays: '1',
      day1Date: '',
      day1Start: '',
      day1End: '',
      day2Date: '',
      day2Start: '',
      day2End: '',
      day3Date: '',
      day3Start: '',
      day3End: '',
      category: 'internships'
    });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
  };

  const formatShiftsDisplay = (shifts) => {
    if (!shifts || shifts.length === 0) return 'No shifts';
    return shifts.map((shift, idx) => (
      <div key={idx} style={{ marginBottom: '4px' }}>
        <div style={{ fontWeight: 500 }}>{shift.date}</div>
        <div style={{ color: '#64748b', fontSize: '12px' }}>
          {shift.shiftStart} - {shift.shiftEnd}
        </div>
      </div>
    ));
  };

  const numDays = parseInt(formData.numberOfDays);
  const displayStudents = activePanel === 'local' ? localStudents : firebaseStudents;

  return (
    <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1e40af' }}>Student Management</h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Sync Status */}
          {syncStatus && (
            <div style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#64748b'
            }}>
              Last sync: {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : 'Never'}
            </div>
          )}
          
          {/* Refresh Database Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '10px 20px',
              background: syncing ? '#94a3b8' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => !syncing && (e.target.style.background = '#059669')}
            onMouseOut={(e) => !syncing && (e.target.style.background = '#10b981')}
          >
            {syncing ? '⟳ Syncing...' : '↻ Refresh Database'}
          </button>
          
          {/* Add Student Button */}
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#2563eb'}
            onMouseOut={(e) => e.target.style.background = '#3b82f6'}
          >
            {showForm ? 'Cancel' : '+ Add Student'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600, color: '#1e40af' }}>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Avatar URL</label>
              <input
                type="text"
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Enter a direct image URL (e.g., from Google Drive, Imgur, etc.)
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Course *</label>
              <select
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">Select course...</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Year *</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="">Select year...</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Achievement 1</label>
              <input
                type="text"
                name="achievement1"
                value={formData.achievement1}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Achievement 2</label>
              <input
                type="text"
                name="achievement2"
                value={formData.achievement2}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Achievement 3</label>
              <input
                type="text"
                name="achievement3"
                value={formData.achievement3}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Number of Days Serving *</label>
              <select
                name="numberOfDays"
                value={formData.numberOfDays}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              >
                <option value="1">1 Day</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
              </select>
            </div>
          </div>

          {/* Day 1 Shift */}
          {numDays >= 1 && (
            <div style={{ marginTop: '20px', padding: '16px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>Day 1 Shift</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Date *</label>
                  <select
                    name="day1Date"
                    value={formData.day1Date}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select date...</option>
                    {getAvailableDates(1).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Start Time *</label>
                  <select
                    name="day1Start"
                    value={formData.day1Start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>End Time *</label>
                  <select
                    name="day1End"
                    value={formData.day1End}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {getAvailableEndTimes(formData.day1Start).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Day 2 Shift */}
          {numDays >= 2 && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>Day 2 Shift</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Date *</label>
                  <select
                    name="day2Date"
                    value={formData.day2Date}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select date...</option>
                    {getAvailableDates(2).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Start Time *</label>
                  <select
                    name="day2Start"
                    value={formData.day2Start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>End Time *</label>
                  <select
                    name="day2End"
                    value={formData.day2End}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {getAvailableEndTimes(formData.day2Start).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Day 3 Shift */}
          {numDays >= 3 && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>Day 3 Shift</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Date *</label>
                  <select
                    name="day3Date"
                    value={formData.day3Date}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select date...</option>
                    {getAvailableDates(3).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Start Time *</label>
                  <select
                    name="day3Start"
                    value={formData.day3Start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>End Time *</label>
                  <select
                    name="day3End"
                    value={formData.day3End}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="">Select time...</option>
                    {getAvailableEndTimes(formData.day3Start).map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: '10px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              {isEditing ? 'Update Student' : 'Add Student'}
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: '10px 24px',
                background: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#475569'}
              onMouseOut={(e) => e.target.style.background = '#64748b'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Database Panel Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActivePanel('local')}
          style={{
            padding: '12px 24px',
            background: activePanel === 'local' ? '#3b82f6' : 'transparent',
            color: activePanel === 'local' ? 'white' : '#64748b',
            border: 'none',
            borderBottom: activePanel === 'local' ? '3px solid #3b82f6' : 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          📦 Local Database ({localStudents.length})
        </button>
        <button
          onClick={() => setActivePanel('firebase')}
          style={{
            padding: '12px 24px',
            background: activePanel === 'firebase' ? '#f59e0b' : 'transparent',
            color: activePanel === 'firebase' ? 'white' : '#64748b',
            border: 'none',
            borderBottom: activePanel === 'firebase' ? '3px solid #f59e0b' : 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px'
          }}
        >
          ☁️ Firebase Database ({firebaseStudents.length})
        </button>
      </div>

      {/* Students Table */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '80px' }}>Avatar</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '150px' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '120px' }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '200px' }}>Course</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '80px' }}>Year</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '60px' }}>Days</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '140px' }}>Shifts</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    {activePanel === 'local' 
                      ? 'No students in local database. Click "Refresh Database" to sync from Firebase.'
                      : 'No students in Firebase. Click "Add Student" to get started.'}
                  </td>
                </tr>
              ) : (
                displayStudents.map((student) => (
                  <tr key={student.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <img
                        src={student.avatar || 'https://via.placeholder.com/40'}
                        alt={student.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', display: 'inline-block' }}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500, color: '#0f172a', fontSize: '14px', verticalAlign: 'middle' }}>{student.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{
                        padding: '4px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}>
                        {categories.find(c => c.id === student.category)?.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>{student.course}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>{student.year}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#475569', verticalAlign: 'middle' }}>
                      {student.numberOfDays || 1}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>
                      {formatShiftsDisplay(student.shifts)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEdit(student)}
                          style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#2563eb'}
                          onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#dc2626'}
                          onMouseOut={(e) => e.target.style.background = '#ef4444'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Stats Footer */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Local Database</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{localStudents.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>students</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Firebase Database</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>{firebaseStudents.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>students</div>
        </div>
      </div>
    </div>
  );
}