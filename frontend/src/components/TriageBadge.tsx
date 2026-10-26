import React from 'react';
import { TriageCategory } from '../types';
import { getResidentVisuals, SkullIcon } from '../utils/triageStyles';

interface TriageBadgeProps {
  triage: TriageCategory;
  isFatality?: boolean;
  showIcon?: boolean;
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ triage, isFatality, showIcon = true }) => {
  const visuals = getResidentVisuals(triage, isFatality);

  if (visuals.isDeceased) {
    return (
      <span
        className="triage-badge EXPECTANT"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 8px',
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 700,
          backgroundColor: '#1C211F',
          color: '#FFFFFF',
          border: '1px solid #4B5563',
          letterSpacing: '0.03em',
        }}
      >
        {showIcon && <SkullIcon size={12} fill="#FFFFFF" stroke="#1C211F" />}
        <span>DECEASED</span>
      </span>
    );
  }

  return (
    <span
      className={`triage-badge ${triage}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 7px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: visuals.bgColor,
        color: visuals.textColor,
        border: `1px solid ${visuals.borderColor}`,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          backgroundColor: visuals.color,
          display: 'inline-block',
        }}
      />
      <span>{visuals.shortLabel}</span>
    </span>
  );
};
