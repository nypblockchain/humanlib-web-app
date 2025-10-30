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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export default function AdminPanel() {
  const [students, setStudents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  
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
    // !!!!!!!!!!!!!!!!!!!!!!!!!!!
    { value: '31/10/2025', label: '8 January' },
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
        
  // Generate time options (9:30 AM to 10:30 PM in 15-minute intervals)
  const generateTimeOptions = () => {
    const times = [];
    // !!!!!!!!!!!!!!!!!!!!!!!!!
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

  // Real-time listener for students
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsData);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, avatar: downloadURL }));
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    }
    setUploading(false);
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
        await updateDoc(doc(db, 'students', editingId), studentData);
        alert('Student updated successfully!');
      } else {
        await addDoc(collection(db, 'students'), studentData);
        alert('Student added successfully!');
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
      day1Date: shifts[0]?.date || '08/01/2025',
      day1Start: shifts[0]?.shiftStart || '',
      day1End: shifts[0]?.shiftEnd || '',
      day2Date: shifts[1]?.date || '09/01/2025',
      day2Start: shifts[1]?.shiftStart || '',
      day2End: shifts[1]?.shiftEnd || '',
      day3Date: shifts[2]?.date || '10/01/2025',
      day3Start: shifts[2]?.shiftStart || '',
      day3End: shifts[2]?.shiftEnd || '',
      category: student.category
    });
    setEditingId(student.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
        alert('Student deleted successfully!');
      } catch (error) {
        alert('Error deleting student: ' + error.message);
      }
    }
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
      day1Date: '08/01/2025',
      day1Start: '',
      day1End: '',
      day2Date: '09/01/2025',
      day2Start: '',
      day2End: '',
      day3Date: '10/01/2025',
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

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1e40af' }}>Student Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#2563eb'}
          onMouseOut={(e) => e.target.style.background = '#3b82f6'}
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: '#f8fafc',
          padding: '20px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Avatar URL</label>
              <input
                type="text"
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Or Upload File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
              {uploading && <span style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px', display: 'block' }}>Uploading...</span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Course *</label>
              <select
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="">Select course...</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Year *</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="">Select year...</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Achievement 1</label>
              <input
                type="text"
                name="achievement1"
                value={formData.achievement1}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Achievement 2</label>
              <input
                type="text"
                name="achievement2"
                value={formData.achievement2}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Achievement 3</label>
              <input
                type="text"
                name="achievement3"
                value={formData.achievement3}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Number of Days Serving *</label>
              <select
                name="numberOfDays"
                value={formData.numberOfDays}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="1">1 Day</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
              </select>
            </div>
          </div>

          {/* Day 1 Shift */}
          {numDays >= 1 && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>Day 1 Shift</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Date *</label>
                <select
                name="day1Date"
                value={formData.day1Date}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                >
                <option value="">Select date...</option>
                {getAvailableDates(1).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                </select>
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Start Time *</label>
                <select
                name="day1Start"
                value={formData.day1Start}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                >
                <option value="">Select time...</option>
                {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                ))}
                </select>
            </div>
            <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>End Time *</label>
            <select
                name="day1End"
                value={formData.day1End}
                onChange={handleInputChange}
                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
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
            <div style={{ marginTop: '12px', padding: '12px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>Day 2 Shift</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Date *</label>
                    <select
                    name="day2Date"
                    value={formData.day2Date}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                    <option value="">Select date...</option>
                    {getAvailableDates(2).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Start Time *</label>
                    <select
                    name="day2Start"
                    value={formData.day2Start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                    <option value="">Select time...</option>
                    {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                    ))}
                    </select>
                </div>
                <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>End Time *</label>
                <select
                    name="day2End"
                    value={formData.day2End}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
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
            <div style={{ marginTop: '12px', padding: '12px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>Day 3 Shift</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Date *</label>
                    <select
                    name="day3Date"
                    value={formData.day3Date}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                    <option value="">Select date...</option>
                    {getAvailableDates(3).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>Start Time *</label>
                    <select
                    name="day3Start"
                    value={formData.day3Start}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                    <option value="">Select time...</option>
                    {timeOptions.map(time => (
                        <option key={time} value={time}>{time}</option>
                    ))}
                    </select>
                </div>
                <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '13px', color: '#475569' }}>End Time *</label>
                <select
                    name="day3End"
                    value={formData.day3End}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
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

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: '8px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              {isEditing ? 'Update' : 'Add Student'}
            </button>
            <button
              onClick={resetForm}
              style={{
                padding: '8px 20px',
                background: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 500,
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

      <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f8fafc' }}>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '80px' }}>Avatar</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '150px' }}>Name</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '120px' }}>Category</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '180px' }}>Course</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '80px' }}>Year</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '60px' }}>Days</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', minWidth: '140px' }}>Shifts</th>
          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#475569', width: '150px' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {students.length === 0 ? (
          <tr>
            <td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No students added yet. Click "Add Student" to get started.
            </td>
          </tr>
        ) : (
          students.map((student) => (
            <tr key={student.id} style={{ borderTop: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                <img
                  src={student.avatar || 'https://via.placeholder.com/40'}
                  alt={student.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', display: 'inline-block' }}
                />
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 500, color: '#0f172a', fontSize: '13px', verticalAlign: 'middle' }}>{student.name}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                <span style={{
                  padding: '3px 8px',
                  background: '#dbeafe',
                  color: '#1e40af',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}>
                  {categories.find(c => c.id === student.category)?.label}
                </span>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>{student.course}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>{student.year}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: '#475569', verticalAlign: 'middle' }}>
                {student.numberOfDays || 1}
              </td>
              <td style={{ padding: '10px 12px 10px 20px', textAlign: 'center', fontSize: '12px', color: '#475569', verticalAlign: 'middle' }}>
                {formatShiftsDisplay(student.shifts)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    onClick={() => handleEdit(student)}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
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
                      padding: '6px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
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
    </div>
  );
}