import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDiYNFFyKmjhViYMo9YPPcZGSuNTqX2Ido",
  authDomain: "humanlib-e647f.firebaseapp.com",
  projectId: "humanlib-e647f",
  storageBucket: "humanlib-e647f.firebasestorage.app",
  messagingSenderId: "207013774871",
  appId: "1:207013774871:web:6a3e2524b6d7e0e4677e52",
  measurementId: "G-XN1WM6QKVX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuration for multiple Raspberry Pis
const PI_CONNECTIONS = [
  { ip: '192.168.10.124', port: 8765, category: 'courses' },
  { ip: '192.168.10.127', port: 8766, category: 'internships' },
  { ip: '192.168.10.128', port: 8767, category: 'overseas' },
  { ip: '192.168.10.129', port: 8768, category: 'professional' },
  { ip: '192.168.10.137', port: 8769, category: 'alumni' }
];

export default function HumanLibraryPie() {
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentsData, setStudentsData] = useState([]);
  const [showCategoryFloor, setShowCategoryFloor] = useState(false);
  const [piConnections, setPiConnections] = useState({});
  
  const timersRef = useRef({});
  const expandTimerRef = useRef(null);
  const floorIntervalRef = useRef(null);
  const socketsRef = useRef({});

  const baseSlices = [
    { 
      id: "text", 
      label: "The Inside Scoop", 
      img: "/img/text.png", 
      floorplan: "./img/defaultfloor.png",
      color: "#ffffff27", 
      angle: 0, 
      distance: 0,
      description: "Made by Jingda TEEHEE"
    },
    { 
      id: "internships", 
      label: "Internships", 
      img: "/img/internships.png", 
      floorplan: "./img/internshipfloor.png",  
      color: "#EF4444", 
      angle: -90, 
      distance: 250,
      description: "Discover internship opportunities and gain hands-on experience in your field."
    },
    { 
      id: "overseas", 
      label: "Overseas Opportunities", 
      img: "/img/overseas.png", 
      floorplan: "./img/defaultfloor.png",
      color: "#22C55E", 
      angle: -90 + 72, 
      distance: 300,
      description: "Study abroad programs and international exchange opportunities."
    },
    { 
      id: "professional", 
      label: "Professional Development", 
      img: "/img/professional.png", 
      floorplan: "./img/defaultfloor.png",
      color: "#BFBFBF", 
      angle: -90 - 72, 
      distance: 300,
      description: "Develop your professional skills through workshops and mentorship programs."
    },
    { 
      id: "alumni", 
      label: "Alumni Progression", 
      img: "/img/alumni.png", 
      floorplan: "./img/defaultfloor.png",
      color: "#FAE316", 
      angle: 126, 
      distance: 300,
      description: "Connect with alumni and learn about career paths after graduation."
    },
    { 
      id: "courses", 
      label: "Courses", 
      img: "/img/courses.png", 
      floorplan: "./img/defaultfloor.png",
      color: "#3B82F6", 
      angle: 54, 
      distance: 300,
      description: "The School of Information Technology (IT) at Nanyang Polytechnic (NYP) offers a wide range of cutting-edge courses designed to equip students with the essential skills and knowledge to thrive in the fast-evolving digital world."
    }
  ];

  // Real-time listener for students from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudentsData(students);
    });

    return () => unsubscribe();
  }, []);

  // Multi-Pi WebSocket connections with optimizations
  useEffect(() => {
    const connectToPi = ({ ip, port, category }) => {
      let socket;
      let reconnectTimeout;
      let connectionAttempts = 0;
      const maxConnectionAttempts = 10;

      const connect = () => {
        connectionAttempts++;
        
        try {
          socket = new WebSocket(`ws://${ip}:${port}`);

          socket.onopen = () => {
            connectionAttempts = 0;
            
            // Batch state update
            setPiConnections(prev => ({
              ...prev,
              [category]: { connected: true, ip, port }
            }));
            
            socket.send(JSON.stringify({
              type: "website_connected",
              message: `React website connected to ${category}`,
              timestamp: Date.now()
            }));
          };

          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // Ignore welcome messages
              if (data.type === "welcome") return;
              
              // Handle button press for this specific category
              const expectedButton = `${category}_button`;
              if (data.button === expectedButton) {
                
                if (data.status === "ON") {
                  // Clear ALL existing timers first
                  Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
                  clearTimeout(expandTimerRef.current);
                  clearInterval(floorIntervalRef.current);
                  
                  // Single batched state update
                  setActive(category);
                  setExpanded(false);
                  setSelectedStudent(null);
                  setShowCategoryFloor(false);
                  
                  // Set up the auto-close timer (30 seconds)
                  timersRef.current[category] = setTimeout(() => {
                    setActive(null);
                    setExpanded(false);
                    setSelectedStudent(null);
                    setShowCategoryFloor(false);
                  }, 30000);
                  
                } else if (data.status === "OFF") {
                  // Clear timers
                  Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
                  clearTimeout(expandTimerRef.current);
                  clearInterval(floorIntervalRef.current);
                  
                  // Single batched state update
                  setActive(null);
                  setExpanded(false);
                  setSelectedStudent(null);
                  setShowCategoryFloor(false);
                }
              }
            } catch (error) {
              console.error(`[${category}] Parse error:`, error);
            }
          };

          socket.onerror = () => {
            // Reduce console spam
          };

          socket.onclose = (event) => {
            setPiConnections(prev => ({
              ...prev,
              [category]: { connected: false, ip, port }
            }));
            
            // Attempt reconnection with exponential backoff
            if (connectionAttempts < maxConnectionAttempts) {
              const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
              reconnectTimeout = setTimeout(connect, delay);
            }
          };

          // Store socket reference
          socketsRef.current[category] = socket;

        } catch (error) {
          console.error(`[${category}] Connection error:`, error);
        }
      };

      // Initial connection
      connect();

      // Return cleanup function
      return () => {
        if (socket) {
          socket.close(1000, "Component unmounting");
        }
        clearTimeout(reconnectTimeout);
        if (timersRef.current[category]) {
          clearTimeout(timersRef.current[category]);
        }
      };
    };

    // Connect to all Pis
    const cleanupFunctions = PI_CONNECTIONS.map(connectToPi);

    // Cleanup all connections on unmount
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      clearTimeout(expandTimerRef.current);
      clearInterval(floorIntervalRef.current);
    };
  }, []);

  // Build slices with students from Firebase (memoized)
  const slices = useMemo(() => {
    return baseSlices.map(slice => {
      const categoryStudents = studentsData
        .filter(student => student.category === slice.id)
        .map(student => ({
          name: student.name,
          avatar: student.avatar,
          course: student.course,
          year: student.year,
          achievements: student.achievements || [],
          shifts: student.shifts || []
        }));

      return {
        ...slice,
        students: categoryStudents
      };
    });
  }, [studentsData]);

  // Check if student is available for any of their shifts
  const isStudentAvailable = (student) => {
    if (!student.shifts || student.shifts.length === 0) return true;
    
    const now = new Date();
    
    return student.shifts.some(shift => {
      if (!shift.date || !shift.shiftStart || !shift.shiftEnd) return false;
      
      const [day, month, year] = shift.date.split('/');
      const [startHour, startMin] = shift.shiftStart.split(':');
      const [endHour, endMin] = shift.shiftEnd.split(':');
      
      const shiftStart = new Date(year, month - 1, day, startHour, startMin);
      const shiftEnd = new Date(year, month - 1, day, endHour, endMin);
      
      return now >= shiftStart && now <= shiftEnd;
    });
  };
  
  const getYOffset = (achievementCount) => {
    const offsets = {
      0: -150,
      1: -200,  
      2: -202.5, 
      3: -215  
    };
    return offsets[achievementCount] || -220;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      const keyMap = {
        '1': 'internships',
        '2': 'overseas',
        '3': 'professional',
        '4': 'alumni',
        '5': 'courses',
        '6': 'text'
      };
      
      if (keyMap[e.key]) {
        const category = keyMap[e.key];
        
        // Clear existing timers
        Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
        clearTimeout(expandTimerRef.current);
        clearInterval(floorIntervalRef.current);
        
        setActive(prev => prev === category ? null : category);
        setExpanded(false);
        setSelectedStudent(null);
        setShowCategoryFloor(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle expansion and student selection when active changes
  useEffect(() => {
    // Clear all existing timers first
    clearTimeout(expandTimerRef.current);
    clearInterval(floorIntervalRef.current);
    
    if (active) {
      const activeSliceData = slices.find(s => s.id === active);
      if (!activeSliceData) return;
      
      const availableStudents = activeSliceData.students.filter(isStudentAvailable);
      const randomStudent = availableStudents.length > 0 
        ? availableStudents[Math.floor(Math.random() * availableStudents.length)]
        : null;
      setSelectedStudent(randomStudent);
      
      // Use setTimeout directly without requestAnimationFrame
      expandTimerRef.current = setTimeout(() => {
        setExpanded(true);
      }, 500);
      
      floorIntervalRef.current = setInterval(() => {
        setShowCategoryFloor(prev => !prev);
      }, 2000);
      
      return () => {
        clearTimeout(expandTimerRef.current);
        clearInterval(floorIntervalRef.current);
      };
    } else {
      setExpanded(false);
      setSelectedStudent(null);
      setShowCategoryFloor(false);
    }
  }, [active, studentsData]);

  const toggle = (id) => {
    // Clear existing timers
    Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    clearTimeout(expandTimerRef.current);
    clearInterval(floorIntervalRef.current);
    
    setActive(active === id ? null : id);
    setExpanded(false);
    setSelectedStudent(null);
    setShowCategoryFloor(false);
  };

  const getPosition = (angle, distance) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance
    };
  };

  const activeSlice = slices.find(s => s.id === active);

  // Connection status indicator
  const connectedCount = Object.values(piConnections).filter(conn => conn.connected).length;

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8f9fa",
      overflow: "hidden"
    }}>

      <div style={{
        width: 800,
        height: 800,
        position: "relative"
      }}>
        {slices.map((s) => {
          const isActive = active === s.id;
          const pos = getPosition(s.angle, s.distance);

          return (
            <motion.div
              key={s.id}
              onClick={() => toggle(s.id)}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                cursor: "pointer",
                userSelect: "none",
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
              initial={false}
              animate={{
                x: isActive && !expanded ? pos.x : isActive && expanded ? -500 : 0,
                y: isActive && !expanded ? pos.y : isActive && expanded ? 0 : 0,
                width: isActive && expanded ? 400 : isActive ? 300 : 500,
                height: isActive && expanded ? 500 : isActive ? 300 : 500,
                borderRadius: isActive ? 24 : 0,
                scale: isActive ? 1 : active ? 0.7 : 1,
                opacity: active && !isActive ? 0.3 : 1,
                zIndex: isActive ? 20 : 1,
                translateX: "-50%",
                translateY: "-50%"
              }}
              transition={{ 
                type: "spring", 
                stiffness: expanded ? 150 : 180, 
                damping: expanded ? 22 : 20 
              }}
            >
              {isActive ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    width: "100%",
                    height: "100%",
                    background: `linear-gradient(135deg, ${s.color} 0%, ${s.color}dd 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: expanded ? "flex-start" : "center",
                    color: "black",
                    padding: expanded ? "40px 35px" : 30,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    border: "4px solid white",
                    overflow: "hidden"
                  }}
                >
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: 28, 
                    fontWeight: 700, 
                    paddingTop: expanded ? "30px" : "0px",
                    width: isActive && expanded ? 420 : isActive ? 300 : 500,
                    textAlign: "center",
                    hyphens: "auto",
                    wordBreak: "break-word" 
                  }}>{s.label}</h2>

                  <div style={{
                    width: 60,
                    height: 4,
                    background: "black",
                    margin: "20px 0",
                    borderRadius: 2
                  }} />
                  
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      style={{ 
                        width: "100%",
                        background: "rgba(255, 255, 255, 0.95)",
                        padding: "24px",
                        borderRadius: "16px",
                        marginTop: "10px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                    >
                      <h3 style={{ 
                        margin: "0 0 16px 0",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1a1a1a",
                        letterSpacing: "-0.5px"
                      }}>
                        About
                      </h3>
                      <p style={{ 
                        fontSize: 15,
                        lineHeight: 1.8,
                        color: "#4a5568",
                        margin: 0,
                        textAlign: "left"
                      }}>
                        {s.description}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <img
                  src={s.img}
                  alt={s.label}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                  draggable={false}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {expanded && selectedStudent && activeSlice && (
          <>
            <motion.div
              key="image-placeholder"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1 
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 150, 
                damping: 22
              }}
              style={{
                position: "absolute",
                left: "26.7%",
                top: "10.7%",
                transform: "translate(-50%, -50%)",
                width: 800,
                height: 800,
                borderRadius: 24,
                zIndex: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={showCategoryFloor ? 'category' : 'default'}
                  src={showCategoryFloor ? activeSlice.floorplan : "./img/defaultfloor.png"}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              </AnimatePresence>
            </motion.div>

            <motion.div
              key="students-panel"
              initial={{ x: -400, opacity: 0, scale: 0 }}
              animate={{ 
                x: 305,
                y: getYOffset(selectedStudent.achievements?.length || 0),
                opacity: 1, 
                scale: 1 
              }}
              exit={{ x: -200, opacity: 0, scale: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 150, 
                damping: 22
              }}
              style={{
                position: "absolute",
                left: "50%",
                top: "44%",
                transform: "translate(-50%, -50%)",
                width: 320,
                padding: 0,
                borderRadius: 20,
                border: `3px solid ${activeSlice.color}`,
                background: "#fff",
                boxShadow: `0 8px 32px ${activeSlice.color}40`,
                zIndex: 25,
                overflow: "hidden"
              }}
            >
              <div style={{
                padding: "35px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px"
              }}>
                <motion.img
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  src={selectedStudent.avatar}
                  alt={selectedStudent.name}
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    border: `5px solid ${activeSlice.color}`,
                    background: "#fff",
                    boxShadow: `0 4px 16px ${activeSlice.color}30`
                  }}
                />
                
                <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{ 
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    textAlign: "center"
                  }}
                >
                  {selectedStudent.name}
                </motion.h3>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    style={{
                      background: `${activeSlice.color}15`,
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: `1px solid ${activeSlice.color}40`
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: "4px" }}>COURSE</div>
                    <div style={{ fontSize: 14, color: "#2c3e50", fontWeight: 500 }}>{selectedStudent.course}</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.85 }}
                    style={{
                      background: `${activeSlice.color}15`,
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: `1px solid ${activeSlice.color}40`
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: "4px" }}>YEAR</div>
                    <div style={{ fontSize: 14, color: "#2c3e50", fontWeight: 500 }}>{selectedStudent.year}</div>
                  </motion.div>

                  {selectedStudent.achievements && selectedStudent.achievements.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                      style={{
                        background: `${activeSlice.color}15`,
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: `1px solid ${activeSlice.color}40`
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: "8px" }}>ACHIEVEMENTS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {selectedStudent.achievements.map((achievement, idx) => (
                          <div 
                            key={idx}
                            style={{ 
                              fontSize: 13, 
                              color: "#2c3e50",
                              paddingLeft: "12px",
                              position: "relative"
                            }}
                          >
                            <span style={{ 
                              position: "absolute", 
                              left: 0, 
                              color: activeSlice.color,
                              fontWeight: 700 
                            }}>•</span>
                            {achievement}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}