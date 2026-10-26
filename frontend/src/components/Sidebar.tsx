import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Flame,
  Users,
  Hospital,
  Navigation,
  History,
  Shield,
  Layers
} from 'lucide-react';
import { VillageSummary } from '../types';

export type Destination = 'overview' | 'map' | 'patients' | 'facilities' | 'evacuation' | 'history';

interface SidebarProps {
  currentDestination: Destination;
  onNavigate: (dest: Destination) => void;
  onOpenBombard: () => void;
  summary: VillageSummary | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentDestination, onNavigate, onOpenBombard, summary }) => {
  const metrics = summary?.metrics;

  const navItems: {
    id: Destination | 'bombard';
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    badge?: number | string;
    badgeVariant?: 'default' | 'warning' | 'danger';
    isSpecial?: boolean;
    onClick?: () => void;
  }[] = [
    {
      id: 'map',
      label: 'Live Village Map',
      icon: MapPin,
      badge: metrics ? `${metrics.total_residents} pop` : undefined,
      onClick: () => onNavigate('map'),
    },
    {
      id: 'overview',
      label: 'Status Overview',
      icon: LayoutDashboard,
      onClick: () => onNavigate('overview'),
    },
    {
      id: 'bombard',
      label: 'Simulate Incident',
      icon: Flame,
      isSpecial: true,
      badge: metrics?.total_incidents ? `${metrics.total_incidents} hit` : 'Active',
      badgeVariant: metrics?.total_incidents ? 'danger' : 'warning',
      onClick: onOpenBombard,
    },
    {
      id: 'patients',
      label: 'Patient Registry',
      icon: Users,
      badge: metrics?.residents_requiring_care,
      badgeVariant: (metrics?.critical_residents || 0) > 0 ? 'danger' : 'warning',
      onClick: () => onNavigate('patients'),
    },
    {
      id: 'facilities',
      label: 'Medical Facilities',
      icon: Hospital,
      badge: metrics ? `${metrics.available_beds}/${metrics.total_beds}` : '5',
      onClick: () => onNavigate('facilities'),
    },
    {
      id: 'evacuation',
      label: 'Evacuation Routes',
      icon: Navigation,
      badge: metrics?.active_evacuation_assignments || undefined,
      badgeVariant: 'warning',
      onClick: () => onNavigate('evacuation'),
    },
    {
      id: 'history',
      label: 'Incident History',
      icon: History,
      badge: metrics?.total_incidents || undefined,
      onClick: () => onNavigate('history'),
    },
  ];

  return (
    <aside className="app-sidebar">
      <div style={{ padding: '16px 14px 8px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7A8780' }}>
          Operations Console
        </div>
        <div style={{ fontSize: 12, color: '#3A443F', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={13} color="#2A6642" />
          <span>Sector AV-01 • Autonomous</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentDestination === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''} ${item.isSpecial ? 'bombard-item' : ''}`}
              onClick={item.onClick || (() => onNavigate(item.id as Destination))}
            >
              <div className="nav-item-left">
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge !== 0 && (
                <span className={`nav-badge ${item.badgeVariant || 'default'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Village Quick Status Card at bottom of sidebar */}
      <div style={{ marginTop: 'auto', padding: 12, margin: 8, backgroundColor: '#FAF8F3', border: '1px solid #DFD7C7', borderRadius: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#68736E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={12} />
          <span>Baseline Topology</span>
        </div>
        <div style={{ fontSize: 11, color: '#4D5852', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Road Segments:</span>
            <strong className="num">{metrics ? `${26 - metrics.open_road_blockages} Open` : '26 Open'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Blockages:</span>
            <strong className="num" style={{ color: (metrics?.open_road_blockages || 0) > 0 ? '#BD3423' : '#2A6642' }}>
              {metrics?.open_road_blockages || 0}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Beds Free:</span>
            <strong className="num">{metrics?.available_beds || 35}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
};
