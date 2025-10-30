import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HumanLibraryPie() {
  const [active, setActive] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudent, setShowStudent] = useState(false);

  const slices = [
    { 
      id: "text", 
      label: "Text", 
      img: "/img/text.png", 
      color: "#FF6B6B", 
      angle: 0, 
      distance: 0,
      description: "Explore various text-based resources and materials.",
      students: [
        
      ]
    },
    { 
      id: "internships", 
      label: "Internships", 
      img: "/img/internships.png", 
      color: "#EF4444", 
      angle: -90, 
      distance: 300,
      description: "Discover internship opportunities and gain hands-on experience in your field.",
      students: [
        
      ]
    },
    { 
      id: "overseas", 
      label: "Overseas Opportunities", 
      img: "/img/overseas.png", 
      color: "#22C55E", 
      angle: -90 + 72, 
      distance: 300,
      description: "Study abroad programs and international exchange opportunities.",
      students: [
        
      ]
    },
    { 
      id: "professional", 
      label: "Professional Development", 
      img: "/img/professional.png", 
      color: "#BFBFBF", 
      angle: -90 - 72, 
      distance: 300,
      description: "Develop your professional skills through workshops and mentorship programs.",
      students: [
      
      ]
    },
    { 
      id: "alumni", 
      label: "Alumni Progression", 
      img: "/img/alumni.png", 
      color: "#FAE316", 
      angle: 126, 
      distance: 300,
      description: "Connect with alumni and learn about career paths after graduation.",
      students: [
        { name: "Bobby hehhe", avatar: "https://media.licdn.com/dms/image/v2/C4D03AQFZZRy-03STfw/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1516480189625?e=1763596800&v=beta&t=jObgu3JiJbTY_GVM6stQXzEx1YQ2dT21g4_6bQi4sSs", roles: ["4 year experience", "Outreach", "Blockchain SIG advisor", "SEN advisor"] },
      ]
    },
    { 
      id: "courses", 
      label: "Courses", 
      img: "/img/courses.png", 
      color: "#3B82F6", 
      angle: 54, 
      distance: 230,
      description: "Explore specialized courses and learning pathways to enhance your skills.",
      students: [
        
      ]
    }
  ];

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
        setActive(prev => prev === keyMap[e.key] ? null : keyMap[e.key]);
        setExpanded(false);
        setSelectedStudent(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (active) {
      const activeSliceData = slices.find(s => s.id === active);
      const randomStudent = activeSliceData.students[Math.floor(Math.random() * activeSliceData.students.length)];
      setSelectedStudent(randomStudent);
      
      const expandTimer = setTimeout(() => {
        setExpanded(true);
      }, 1500);
      
      const autoCloseTimer = setTimeout(() => {
        setActive(null);
        setExpanded(false);
        setSelectedStudent(null);
      }, 30000);
      
      return () => {
        clearTimeout(expandTimer);
        clearTimeout(autoCloseTimer);
      };
    } else {
      setExpanded(false);
      setSelectedStudent(null);
    }
  }, [active]);

  const toggle = (id) => {
    setActive(active === id ? null : id);
    setExpanded(false);
    setSelectedStudent(null);
  };

  const getPosition = (angle, distance) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance
    };
  };

  const activeSlice = slices.find(s => s.id === active);

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
                x: isActive && !expanded ? pos.x : isActive && expanded ? -400 : 0,
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

      {/* Expanded Students Panel - Right of expanded popup */}
      <AnimatePresence>
        {expanded && selectedStudent && activeSlice && (
          <motion.div
            key="students-panel"
            initial={{ x: -400, opacity: 0, scale: 0 }}
            animate={{ 
              x: 210,
              y: -220,
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
              top: "50%",
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
                  gap: "10px"
                }}
              >
                {selectedStudent.roles.map((role, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (idx * 0.1) }}
                    style={{
                      fontSize: 14,
                      color: "#2c3e50",
                      padding: "10px 0",
                      borderBottom: idx < selectedStudent.roles.length - 1 ? `1px solid ${activeSlice.color}30` : "none",
                      textAlign: "center",
                      fontWeight: 500
                    }}
                  >
                    {role}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}