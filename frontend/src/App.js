import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HumanLibraryPie from './HumanLibraryPie';
import Admin from './Admin';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HumanLibraryPie />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;