import React from 'react';
import { TriageCategory } from '../types';

export interface TriageVisualInfo {
  category: TriageCategory;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  markerRadius: number;
  strokeWidth: number;
  isDeceased: boolean;
  priorityOrder: number;
  description: string;
}

export const TRIAGE_VISUALS: Record<TriageCategory, TriageVisualInfo> = {
  IMMEDIATE: {
    category: 'IMMEDIATE',
    label: 'Critical (Red / P1)',
    shortLabel: 'Critical',
    color: '#BD3423',
    bgColor: '#FCECE9',
    borderColor: '#F2AEA3',
    textColor: '#BD3423',
    markerRadius: 7.5,
    strokeWidth: 2.0,
    isDeceased: false,
    priorityOrder: 1,
    description: 'Life-threatening trauma or shock; immediate resuscitation required',
  },
  DELAYED: {
    category: 'DELAYED',
    label: 'Serious (Orange / P2)',
    shortLabel: 'Serious',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FDBA74',
    textColor: '#C2410C',
    markerRadius: 6.0,
    strokeWidth: 1.5,
    isDeceased: false,
    priorityOrder: 2,
    description: 'Major injury or fracture; stable airway, hospitalization required',
  },
  MINIMAL: {
    category: 'MINIMAL',
    label: 'Minor (Yellow / P3)',
    shortLabel: 'Minor',
    color: '#CA8A04',
    bgColor: '#FEF9C3',
    borderColor: '#FDE047',
    textColor: '#854D0E',
    markerRadius: 5.0,
    strokeWidth: 1.5,
    isDeceased: false,
    priorityOrder: 3,
    description: 'Walking wounded; lacerations, sprains, ambulatory care',
  },
  STABLE: {
    category: 'STABLE',
    label: 'Stable (Green / Safe)',
    shortLabel: 'Stable',
    color: '#2A6642',
    bgColor: '#E7F2EB',
    borderColor: '#B8DCBF',
    textColor: '#2A6642',
    markerRadius: 4.0,
    strokeWidth: 1.0,
    isDeceased: false,
    priorityOrder: 4,
    description: 'Normal baseline vitals; verified safe and sheltered in place',
  },
  EXPECTANT: {
    category: 'EXPECTANT',
    label: 'Deceased (Skull / P4)',
    shortLabel: 'Deceased',
    color: '#1C211F',
    bgColor: '#EAECEB',
    borderColor: '#4B5563',
    textColor: '#1C211F',
    markerRadius: 7.0,
    strokeWidth: 2.0,
    isDeceased: true,
    priorityOrder: 5,
    description: 'Non-survivable blast trauma; pulseless with confirmed asystole',
  },
};

export function getResidentVisuals(triage: TriageCategory, isFatality?: boolean): TriageVisualInfo {
  if (isFatality || triage === 'EXPECTANT') {
    return TRIAGE_VISUALS.EXPECTANT;
  }
  return TRIAGE_VISUALS[triage] || TRIAGE_VISUALS.STABLE;
}

/**
 * Clean, respectful Skull SVG Icon for map markers & badges
 */
export const SkullIcon: React.FC<{ size?: number; fill?: string; stroke?: string }> = ({
  size = 14,
  fill = '#1C211F',
  stroke = '#FFFFFF',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Cranium dome and jaw */}
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 15.5 3.8 18.58 6.54 20.35C7 20.65 7.42 20.25 7.42 19.72V18.5C7.42 18.22 7.64 18 7.92 18H8.5V21C8.5 21.55 8.95 22 9.5 22H14.5C15.05 22 15.5 21.55 15.5 21V18H16.08C16.36 18 16.58 18.22 16.58 18.5V19.72C16.58 20.25 17 20.65 17.46 20.35C20.2 18.58 22 15.5 22 12C22 6.48 17.52 2 12 2Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left eye socket */}
      <ellipse cx="8.5" cy="11.5" rx="2" ry="2.5" fill="#FFFFFF" />
      {/* Right eye socket */}
      <ellipse cx="15.5" cy="11.5" rx="2" ry="2.5" fill="#FFFFFF" />
      {/* Inverted triangular nasal cavity */}
      <polygon points="12,14.2 11,16.2 13,16.2" fill="#FFFFFF" />
      {/* Teeth dividing lines */}
      <line x1="10.5" y1="19" x2="10.5" y2="21.5" stroke="#FFFFFF" strokeWidth="1" />
      <line x1="12" y1="19" x2="12" y2="21.5" stroke="#FFFFFF" strokeWidth="1" />
      <line x1="13.5" y1="19" x2="13.5" y2="21.5" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
};
