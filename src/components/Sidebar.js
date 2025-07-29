import React from 'react';
import './Sidebar.css';

function Sidebar({ setView, toggleSidebar, isSidebarOpen }) {
  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <button onClick={toggleSidebar} className="toggle-button">
        {isSidebarOpen ? '<' : '>'}
      </button>
      <ul>
        <li onClick={() => setView('equipment')}>Equipment</li>
        <li onClick={() => setView('dashboard')}>Dashboard</li>
      </ul>
    </div>
  );
}

export default Sidebar;