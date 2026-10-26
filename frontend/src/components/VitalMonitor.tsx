import React, { useMemo } from 'react';
import { Heart, Wind, Gauge, Activity, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';
import { Resident, VitalObservation } from '../types';
import { TriageBadge } from './TriageBadge';

interface VitalMonitorProps {
  resident: Resident;
  vitals?: VitalObservation | null;
  compact?: boolean;
  theme?: 'dark' | 'light';
}

export const VitalMonitor: React.FC<VitalMonitorProps> = ({
  resident,
  vitals: propVitals,
  compact = false,
  theme = 'light',
}) => {
  const vitals = propVitals || resident.latest_vitals;
  const isDeceased = resident.is_fatality || resident.active_triage === 'EXPECTANT';

  const heartRate = isDeceased ? 0 : (vitals ? vitals.heart_rate : 72);
  const spo2 = isDeceased ? 0 : (vitals ? vitals.spo2 : 98);
  const sys = isDeceased ? 0 : (vitals ? vitals.systolic : 120);
  const dia = isDeceased ? 0 : (vitals ? vitals.diastolic : 80);
  const rr = isDeceased ? 0 : (vitals ? vitals.respiratory_rate : 16);
  const bpString = isDeceased ? '-- / --' : (vitals ? vitals.blood_pressure : '120/80');
  const consciousness = isDeceased ? 'UNRESPONSIVE / ASYSTOLE' : (vitals ? vitals.consciousness : 'ALERT');

  const isTachycardic = heartRate > 100;
  const isBradycardic = heartRate > 0 && heartRate < 60;
  const isHypoxic = spo2 > 0 && spo2 < 90;
  const isMildHypoxic = spo2 >= 90 && spo2 < 95;
  const isHypotensive = sys > 0 && sys < 90;
  const isHypertensive = sys >= 140;

  // Generate dynamic ECG P-Q-R-S-T Waveform Path
  const ecgPath = useMemo(() => {
    const totalWidth = 440;
    const midY = 36;

    if (isDeceased || heartRate === 0) {
      // Flatline: horizontal line with micro-deviations (asystole noise)
      let d = `M 0,${midY}`;
      for (let x = 10; x <= totalWidth; x += 10) {
        const jitter = ((x * 13) % 5 === 0) ? 0.8 : (((x * 7) % 3 === 0) ? -0.8 : 0);
        d += ` L ${x},${midY + jitter}`;
      }
      return d;
    }

    // Dynamic cycle repetition width inversely proportional to heart rate
    // 60 bpm -> ~90px, 120 bpm -> ~45px
    const cycleWidth = Math.max(38, Math.min(115, Math.round((60 / heartRate) * 85)));
    let d = `M 0,${midY}`;
    let curX = 0;

    while (curX < totalWidth) {
      const p = curX;
      // 1. Isoelectric baseline to P-wave start
      d += ` L ${p + cycleWidth * 0.15},${midY}`;
      // 2. P-wave: gentle upward bump
      d += ` Q ${p + cycleWidth * 0.22},${midY - 7} ${p + cycleWidth * 0.28},${midY}`;
      // 3. PR segment: brief pause
      d += ` L ${p + cycleWidth * 0.35},${midY}`;
      // 4. Q-wave: slight downward notch
      d += ` L ${p + cycleWidth * 0.38},${midY + 4}`;
      // 5. R-wave: sharp tall ventricular spike
      d += ` L ${p + cycleWidth * 0.43},${midY - 26}`;
      // 6. S-wave: sharp downward deflection
      d += ` L ${p + cycleWidth * 0.48},${midY + 10}`;
      // 7. J-point return to baseline
      d += ` L ${p + cycleWidth * 0.53},${midY}`;
      // 8. ST segment
      d += ` L ${p + cycleWidth * 0.62},${midY}`;
      // 9. T-wave: ventricular repolarization dome
      d += ` Q ${p + cycleWidth * 0.74},${midY - 11} ${p + cycleWidth * 0.85},${midY}`;
      // 10. Isoelectric interval to next cycle
      d += ` L ${p + cycleWidth},${midY}`;

      curX += cycleWidth;
    }

    return d;
  }, [heartRate, isDeceased]);

  // Generate Respiratory Sinusoidal Wave
  const respiratoryPath = useMemo(() => {
    const totalWidth = 440;
    const midY = 18;

    if (isDeceased || rr === 0) {
      return `M 0,${midY} L ${totalWidth},${midY}`;
    }

    // Respiratory period width
    const wavelength = Math.max(30, Math.min(100, Math.round((20 / rr) * 70)));
    let d = `M 0,${midY}`;
    for (let x = 0; x <= totalWidth; x += wavelength) {
      d += ` Q ${x + wavelength * 0.25},${midY - 10} ${x + wavelength * 0.5},${midY}`;
      d += ` Q ${x + wavelength * 0.75},${midY + 10} ${x + wavelength},${midY}`;
    }
    return d;
  }, [rr, isDeceased]);

  const traceColor = isDeceased
    ? '#4A5550'
    : isTachycardic || isBradycardic
    ? '#BD3423'
    : '#2A6642';

  const respColor = isDeceased ? '#4A5550' : '#41728C';

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#121815' : '#FAF8F3';
  const borderColor = isDark ? '#23322B' : '#E2DBD0';
  const textColor = isDark ? '#E2ECE6' : '#1C211F';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: compact ? 12 : 16,
      }}
    >
      {/* Top Telemetry Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color={traceColor} />
          <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
            Simulated Physiological Telemetry
          </span>
          <span
            className="mono"
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 3,
              backgroundColor: isDeceased ? '#333A37' : '#E4EDE7',
              color: isDeceased ? '#C4CCC8' : '#2A6642',
              fontWeight: 600,
            }}
          >
            {isDeceased ? 'ASYSTOLE' : `${heartRate} BPM`}
          </span>
        </div>

        <TriageBadge triage={resident.active_triage} />
      </div>

      {/* Deceased Banner Notice if deceased */}
      {isDeceased && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#2A2F2D',
            border: '1px solid #48524E',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#DCE2DF',
            fontSize: 12,
          }}
        >
          <ShieldAlert size={16} color="#E85D4A" />
          <span>
            <strong>RESIDENT DECEASED (EXPECTANT)</strong> • Lethal blast trauma. Pulseless with confirmed asystole. Excluded from active vehicle evacuations.
          </span>
        </div>
      )}

      {/* 1. ECG Waveform Display Strip */}
      <div
        className={isDark ? 'ecg-grid-dark' : 'ecg-grid'}
        style={{
          position: 'relative',
          width: '100%',
          height: 72,
          backgroundColor: isDark ? '#0F1512' : '#F4F1EA',
          border: `1px solid ${isDark ? '#1F2B24' : '#D6CEBE'}`,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg
          viewBox="0 0 440 72"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Baseline centerline */}
          <line x1="0" y1="36" x2="440" y2="36" stroke={isDark ? '#1C2921' : '#E2DCD0'} strokeWidth="1" strokeDasharray="3,3" />

          {/* Dynamic ECG Waveform */}
          <path
            d={ecgPath}
            fill="none"
            stroke={traceColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Lead Label */}
        <div
          className="mono"
          style={{
            position: 'absolute',
            top: 4,
            left: 8,
            fontSize: 10,
            fontWeight: 700,
            color: isDark ? '#7E9C8B' : '#73827A',
            letterSpacing: '0.05em',
          }}
        >
          LEAD II • {isDeceased ? 'FLATLINE (0 BPM)' : isTachycardic ? 'SINUS TACHYCARDIA' : isBradycardic ? 'SINUS BRADYCARDIA' : 'NORMAL SINUS RHYTHM'}
        </div>

        {/* Sweep Scan Indicator */}
        {!isDeceased && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 14,
              background: 'linear-gradient(to right, transparent, rgba(42, 102, 66, 0.25))',
              animation: `routeDashFlow ${(60 / heartRate) * 1.5}s linear infinite`,
            }}
          />
        )}
      </div>

      {/* 2. Respiratory Rhythm Waveform */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 36,
          backgroundColor: isDark ? '#0D1418' : '#EFF3F5',
          border: `1px solid ${isDark ? '#1B2930' : '#D2DCE0'}`,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox="0 0 440 36"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <path
            d={respiratoryPath}
            fill="none"
            stroke={respColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        <div
          className="mono"
          style={{
            position: 'absolute',
            top: 3,
            left: 8,
            fontSize: 9,
            fontWeight: 700,
            color: isDark ? '#729BB0' : '#5E7D8C',
          }}
        >
          RESP WAVE • {isDeceased ? 'APNEIC' : `${rr} Br/min (${vitals?.consciousness || 'Normal'})`}
        </div>
      </div>

      {/* 3. Physiological Parameters Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {/* Heart Rate Metric */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isDark ? '#161F1A' : '#FFFFFF',
            border: `1px solid ${isDark ? '#27362E' : '#DDD5C6'}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#77847E', fontWeight: 600 }}>
            <Heart size={12} color={traceColor} />
            <span>PULSE</span>
          </div>
          <div className="num" style={{ fontSize: 20, fontWeight: 700, color: traceColor, marginTop: 2 }}>
            {isDeceased ? '0' : heartRate} <span style={{ fontSize: 10, fontWeight: 500, color: '#888' }}>bpm</span>
          </div>
          <div style={{ fontSize: 9.5, color: '#77847E', marginTop: 1 }}>
            {isDeceased ? 'Asystole' : isTachycardic ? 'Tachycardia' : isBradycardic ? 'Bradycardia' : 'Sinus 60-90'}
          </div>
        </div>

        {/* SpO2 Saturation Metric */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isDark ? '#161F1A' : '#FFFFFF',
            border: `1px solid ${isDark ? '#27362E' : '#DDD5C6'}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#77847E', fontWeight: 600 }}>
            <Wind size={12} color={isHypoxic ? '#BD3423' : isMildHypoxic ? '#C7781C' : '#2A6642'} />
            <span>SpO2</span>
          </div>
          <div className="num" style={{ fontSize: 20, fontWeight: 700, color: isHypoxic ? '#BD3423' : isMildHypoxic ? '#C7781C' : textColor, marginTop: 2 }}>
            {isDeceased ? '--' : `${spo2}%`}
          </div>

          {/* Visual Mini Saturation Bar */}
          <div style={{ width: '100%', height: 4, backgroundColor: '#E0DAD0', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: isDeceased ? '0%' : `${spo2}%`,
                height: '100%',
                backgroundColor: isHypoxic ? '#BD3423' : isMildHypoxic ? '#C7781C' : '#2A6642',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Blood Pressure Metric */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isDark ? '#161F1A' : '#FFFFFF',
            border: `1px solid ${isDark ? '#27362E' : '#DDD5C6'}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#77847E', fontWeight: 600 }}>
            <Gauge size={12} color={isHypotensive ? '#BD3423' : isHypertensive ? '#C7781C' : '#444'} />
            <span>NIBP</span>
          </div>
          <div className="num" style={{ fontSize: 15, fontWeight: 700, color: isHypotensive ? '#BD3423' : textColor, marginTop: 4 }}>
            {bpString}
          </div>
          <div style={{ fontSize: 9.5, color: '#77847E', marginTop: 1 }}>
            {isDeceased ? 'Pulseless' : isHypotensive ? 'Shock alert' : isHypertensive ? 'Elevated' : 'Normotensive'}
          </div>
        </div>

        {/* Respiration & Level */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isDark ? '#161F1A' : '#FFFFFF',
            border: `1px solid ${isDark ? '#27362E' : '#DDD5C6'}`,
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#77847E', fontWeight: 600 }}>
            <Eye size={12} color="#444" />
            <span>RESP / CNS</span>
          </div>
          <div className="num" style={{ fontSize: 15, fontWeight: 700, color: textColor, marginTop: 4 }}>
            {isDeceased ? '0 /min' : `${rr} /min`}
          </div>
          <div style={{ fontSize: 9.5, color: '#77847E', marginTop: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {consciousness}
          </div>
        </div>
      </div>
    </div>
  );
};
