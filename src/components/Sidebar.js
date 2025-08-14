import React from 'react';
import useUIStore from '../store/uiStore';
import './Sidebar.css';

const Sidebar = React.memo(function Sidebar({ toggleSidebar, isSidebarOpen }) {
  const view = useUIStore((state) => state.view);
  const setView = useUIStore((state) => state.setView);

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
        <li>
          <button
            type="button"
            onClick={() => setView('templateBuilder')}
            className={view === 'templateBuilder' ? 'active' : ''}
            aria-current={view === 'templateBuilder' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Template Builder">📝</span>
            <span>Template Builder</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('scheduler')}
            className={view === 'scheduler' ? 'active' : ''}
            aria-current={view === 'scheduler' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Scheduler">📅</span>
            <span>Scheduler</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('reporting')}
            className={view === 'reporting' ? 'active' : ''}
            aria-current={view === 'reporting' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Reporting">📄</span>
            <span>Reporting</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('workOrders')}
            className={view === 'workOrders' ? 'active' : ''}
            aria-current={view === 'workOrders' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Work Orders">🔧</span>
            <span>Work Orders</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('preventiveMaintenance')}
            className={view === 'preventiveMaintenance' ? 'active' : ''}
            aria-current={view === 'preventiveMaintenance' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Preventive Maintenance">🔄</span>
            <span>Preventive Maintenance</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('deficiencies')}
            className={view === 'deficiencies' ? 'active' : ''}
            aria-current={view === 'deficiencies' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Deficiencies">⚠️</span>
            <span>Deficiencies</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('loadTests')}
            className={view === 'loadTests' ? 'active' : ''}
            aria-current={view === 'loadTests' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Load Tests">🏋️</span>
            <span>Load Tests</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('calibrations')}
            className={view === 'calibrations' ? 'active' : ''}
            aria-current={view === 'calibrations' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Calibrations">🎯</span>
            <span>Calibrations</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('credentials')}
            className={view === 'credentials' ? 'active' : ''}
            aria-current={view === 'credentials' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Credentials">🎓</span>
            <span>Credentials</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('compliance')}
            className={view === 'compliance' ? 'active' : ''}
            aria-current={view === 'compliance' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Compliance">🛡️</span>
            <span>Compliance</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setView('settings')}
            className={view === 'settings' ? 'active' : ''}
            aria-current={view === 'settings' ? 'page' : undefined}
            tabIndex={0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', background: 'none', border: 'none', color: 'inherit', font: 'inherit', padding: 0, cursor: 'pointer' }}
          >
            <span role="img" aria-label="Settings">⚙️</span>
            <span>Settings</span>
          </button>
        </li>
      </ul>
    </nav>
  );
});

export default Sidebar;
