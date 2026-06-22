import React from 'react';
import { LayoutDashboard, Users, Fingerprint, History, School } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tablero Principal', icon: LayoutDashboard },
    { id: 'teachers', label: 'Personal Docente', icon: Users },
    { id: 'biometrics', label: 'Lector Biométrico', icon: Fingerprint },
    { id: 'logs', label: 'Registro de Accesos', icon: History }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <School size={32} className="brand-icon" />
        <div className="brand-info">
          <h1>Escuela López Jordán</h1>
          <span>Administración</span>
        </div>
      </div>
      
      <nav className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <p>Sistema de Control Biométrico</p>
        <p>v1.0.0 Scalable</p>
      </div>
    </aside>
  );
};
