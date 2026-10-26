import React, { useState, useEffect } from 'react';
import {
  Hospital,
  Activity,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  MapPin,
  Users
} from 'lucide-react';
import { MedicalFacility, Resident } from '../types';
import { api } from '../api/client';
import { Destination } from '../components/Sidebar';

interface FacilitiesViewProps {
  onNavigate: (dest: Destination, params?: any) => void;
  onSelectResident?: (residentId: number) => void;
}

export const FacilitiesView: React.FC<FacilitiesViewProps> = ({ onNavigate, onSelectResident }) => {
  const [facilities, setFacilities] = useState<MedicalFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<MedicalFacility | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await api.getFacilities();
      setFacilities(data);
      if (data.length > 0 && !selectedFacility) {
        loadDetail(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    try {
      const detail = await api.getFacilityDetail(id);
      setSelectedFacility(detail);
    } catch (err) {
      console.error('Failed to load facility detail:', err);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#F8F6F1' }}>
      {/* Facilities Cards Grid */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1B221E', margin: 0 }}>
            Medical Facilities Network
          </h2>
          <div style={{ fontSize: 12, color: '#68746E', marginTop: 2 }}>
            5 Fictional Treatment Facilities • Dynamic Surge Capacity & Clinical Specializations
          </div>
        </div>

        {/* Facilities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {facilities.map((fac) => {
            const isSelected = selectedFacility?.id === fac.id;
            const pct = Math.round((fac.current_occupancy / fac.total_capacity) * 100);
            const isSurge = fac.available_capacity <= 0;

            return (
              <div
                key={fac.id}
                onClick={() => loadDetail(fac.id)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isSelected ? '2px solid #1A211E' : '1px solid #D8D0C0',
                  borderRadius: 4,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#77847E' }}>
                      [{fac.code}]
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
                      {fac.name}
                    </h3>
                    <div style={{ fontSize: 11, color: '#6B7771' }}>
                      {fac.neighborhood_name} • {fac.facility_type.replace('_', ' ')}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      backgroundColor: isSurge ? '#FCECE9' : '#E7F2EB',
                      color: isSurge ? '#BD3423' : '#2A6642',
                      border: `1px solid ${isSurge ? '#F3B4AA' : '#B8DCBF'}`,
                    }}
                  >
                    {fac.operational_status}
                  </span>
                </div>

                {/* Capacity Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#5F6B65' }}>Bed Occupancy:</span>
                    <strong className="num" style={{ color: isSurge ? '#BD3423' : '#1A211E' }}>
                      {fac.current_occupancy} / {fac.total_capacity} ({fac.available_capacity} free)
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: 7, backgroundColor: '#E4DDD0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: pct >= 100 ? '#BD3423' : (pct > 60 ? '#C7781C' : '#2A6642'),
                      }}
                    />
                  </div>
                </div>

                {/* Capabilities Chips */}
                <div>
                  <div style={{ fontSize: 11, color: '#77847E', marginBottom: 4, fontWeight: 600 }}>Specializations:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {fac.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '2px 6px',
                          borderRadius: 3,
                          backgroundColor: '#FAF5EA',
                          border: '1px solid #E5DEC9',
                          color: '#4B5751',
                        }}
                      >
                        {cap.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#77847E', paddingTop: 6, borderTop: '1px solid #F0EAE0' }}>
                  <span>Roadway Access: <strong>{fac.access_road_status}</strong></span>
                  <span>Channel: <strong>{fac.contact_channel}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Facility Patient Admissions Panel */}
      {selectedFacility && (
        <div
          style={{
            width: 380,
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #D8D0C0',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 20,
            gap: 16,
            boxShadow: '-2px 0 10px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <span className="mono" style={{ fontSize: 11, color: '#77847E' }}>[{selectedFacility.code}]</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A211E', marginTop: 2 }}>
              {selectedFacility.name}
            </h3>
            <div style={{ fontSize: 12, color: '#66736D' }}>
              Admitted & Assigned Patient Roster
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedFacility.assigned_patients && selectedFacility.assigned_patients.length > 0 ? (
              selectedFacility.assigned_patients.map((patient: Resident) => (
                <div
                  key={patient.id}
                  style={{
                    padding: 10,
                    backgroundColor: '#FAF8F3',
                    border: '1px solid #DFD7C7',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#1A211E' }}>{patient.full_name}</strong>
                    <span className="mono" style={{ fontSize: 10, color: '#77847E' }}>[{patient.code}]</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4B5751' }}>
                    {patient.medical_condition}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#68746E' }}>Status: {patient.evacuation_status}</span>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        if (onSelectResident) onSelectResident(patient.id);
                        onNavigate('map', { residentId: patient.id });
                      }}
                      style={{ fontSize: 11, padding: '2px 7px' }}
                    >
                      <MapPin size={11} />
                      <span>Map</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#7E8B85', backgroundColor: '#FAF8F3', borderRadius: 4, fontSize: 12 }}>
                No active patients assigned to this facility.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
