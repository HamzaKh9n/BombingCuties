import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleReset = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C03623', fontWeight: 600 }}>
            <AlertTriangle size={18} />
            <span>Reset Aster Vale to Baseline</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: '#1C211F', fontSize: 13, lineHeight: 1.6 }}>
            This will purge all simulated incidents, damage records, and dynamic evacuation logs, restoring Aster Vale to its <strong>pure baseline demonstration state</strong>.
          </p>

          <div
            style={{
              padding: 12,
              backgroundColor: '#F7F4EE',
              border: '1px solid #DED7C8',
              borderRadius: 4,
              fontSize: 12,
              color: '#47514C',
              lineHeight: 1.5,
            }}
          >
            <strong>Baseline Configuration Restored:</strong>
            <ul style={{ paddingLeft: 18, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <li>Total Residents: <strong>100</strong></li>
              <li>Stable / Safe Residents: <strong>98</strong></li>
              <li>Requiring Medical Attention: <strong>2</strong> (Clara Vane & Thomas Sterling)</li>
              <li>Critical / Immediate: <strong>0</strong></li>
              <li>Medical Facilities: <strong>5</strong></li>
              <li>Open Road Blockages: <strong>0</strong></li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleReset} disabled={loading}>
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Resetting Database...' : 'Confirm Baseline Reset'}
          </button>
        </div>
      </div>
    </div>
  );
};
