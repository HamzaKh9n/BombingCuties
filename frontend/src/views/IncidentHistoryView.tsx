import React, { useState, useEffect } from 'react';
import {
  History,
  Flame,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Truck,
  UserCheck,
  Filter,
  Clock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { AuditEvent } from '../types';
import { api } from '../api/client';

export const IncidentHistoryView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType !== 'ALL' && ev.event_type !== filterType) return false;
    return true;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'INCIDENT_COMMITTED':
        return <Flame size={15} color="#BD3423" />;
      case 'TRIAGE_OVERRIDE':
        return <UserCheck size={15} color="#C7781C" />;
      case 'ROAD_BLOCKAGE_REPORTED':
      case 'ROAD_BLOCKAGE_CLEARED':
        return <AlertTriangle size={15} color="#8F5413" />;
      case 'EVACUATION_STATUS_CHANGED':
        return <Truck size={15} color="#2A6642" />;
      case 'DEMO_RESET':
        return <RotateCcw size={15} color="#4B5751" />;
      default:
        return <History size={15} color="#77847E" />;
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B221E', margin: 0 }}>
            Incident History & Operational Audit Log
          </h2>
          <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
            Complete deterministic audit trail of disaster executions, road status modifications, and triage overrides.
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', padding: '6px 10px', border: '1px solid #D6CEBE', borderRadius: 4 }}>
          <Filter size={13} color="#77847E" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#1A211E', fontWeight: 600 }}
          >
            <option value="ALL">All Event Types</option>
            <option value="INCIDENT_COMMITTED">Simulated Incidents</option>
            <option value="TRIAGE_OVERRIDE">Triage Overrides</option>
            <option value="ROAD_BLOCKAGE_REPORTED">Road Blockages Reported</option>
            <option value="ROAD_BLOCKAGE_CLEARED">Road Blockages Cleared</option>
            <option value="EVACUATION_STATUS_CHANGED">Evacuation Missions</option>
            <option value="DEMO_RESET">Baseline Resets</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#77847E' }}>
            Loading audit records...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#77847E', backgroundColor: '#FFFFFF', borderRadius: 4 }}>
            No audit events found for selected filter.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = !!expandedIds[ev.id];
            const hasPayload = ev.payload && Object.keys(ev.payload).length > 0;

            return (
              <div
                key={ev.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D8D0C0',
                  borderRadius: 4,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getEventIcon(ev.event_type)}
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A211E', textTransform: 'capitalize' }}>
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#77847E', fontSize: 11 }}>
                    <span>By: <strong>{ev.actor}</strong></span>
                    <span>•</span>
                    <span className="mono">{new Date(ev.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#3A443F', lineHeight: 1.4 }}>
                  {ev.summary}
                </div>

                {hasPayload && (
                  <div>
                    <button
                      onClick={() => toggleExpand(ev.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11,
                        color: '#6F7B75',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span>{isExpanded ? 'Hide Payload' : 'Inspect Audit Payload JSON'}</span>
                    </button>

                    {isExpanded && (
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 10,
                          backgroundColor: '#FAF8F3',
                          border: '1px solid #DFD7C7',
                          borderRadius: 3,
                          fontSize: 11,
                          fontFamily: 'var(--font-mono)',
                          color: '#333',
                          overflowX: 'auto',
                        }}
                      >
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
