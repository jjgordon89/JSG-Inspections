import React from 'react';
import useStore from '../store';
import './Sidebar.css';

const Sidebar = React.memo(function Sidebar({ toggleSidebar, isSidebarOpen }) {
  const { view, setView } = useStore();

  return (
    <nav
      className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
      aria-label="Main navigation"
      role="navigation"
    >
      <button
        onClick={toggleSidebar}
        className="toggle-button"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isSidebarOpen ? '<' : '>'}
      </button>
      <ul role="menu">
        <li>
          <button
            type="button"
            onClick={() => setView('equipment')}
            className={view === 'equipment' ? 'active' : ''}
            aria-current={view === 'equipment' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Equipment">🛠️</span>
            <span>Equipment</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className={view === 'dashboard' ? 'active' : ''}
            aria-current={view === 'dashboard' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Dashboard">📊</span>
            <span>Dashboard</span>
          </button>
        </li>
      </ul>
    </nav>
  );
});

export default Sidebar;
