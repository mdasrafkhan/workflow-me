import React from 'react';
import { NodeRegistry } from './core/NodeRegistry';

function PropertiesPanel({ node, onChange, onClose, onDelete }) {
  if (!node) {
    return null; // Or a placeholder message
  }

  // Get node type configuration from NodeRegistry
  const nodeType = NodeRegistry.getNodeType(node.type);

  if (!nodeType || !nodeType.properties || nodeType.properties.length === 0) {
    return (
      <div style={panelStyle}>
        <h3>Node Properties</h3>
        <p>No configurable properties for this node type.</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={onClose} style={buttonStyle}>Close</button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this node?')) {
                onDelete && onDelete();
                onClose();
              }
            }}
            style={{
              ...buttonStyle,
              backgroundColor: '#ff3b30',
              color: 'white'
            }}
          >
            🗑️ Delete Node
          </button>
        </div>
      </div>
    );
  }

  // Render properties dynamically
  const renderProperty = (property) => {
    const currentValue = node.data?.[property.key] || property.default || '';

    if (property.type === 'select') {
      return (
        <div key={property.key} style={{ marginBottom: '16px' }}>
          <label htmlFor={property.key} style={labelStyle}>{property.label}:</label>
          <select
            id={property.key}
            value={currentValue}
            onChange={(e) => {
              const newData = { ...node.data, [property.key]: e.target.value };
              onChange(newData);
            }}
            style={selectStyle}
          >
            <option value="">--Please choose an option--</option>
            {property.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    } else if (property.type === 'text') {
      return (
        <div key={property.key} style={{ marginBottom: '16px' }}>
          <label htmlFor={property.key} style={labelStyle}>{property.label}:</label>
          <input
            id={property.key}
            type="text"
            value={currentValue}
            onChange={(e) => {
              const newData = { ...node.data, [property.key]: e.target.value };
              onChange(newData);
            }}
            style={selectStyle}
            placeholder={property.placeholder || ''}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div style={panelStyle}>
      <h3>Edit {nodeType.label} Node</h3>
      {nodeType.properties.map(renderProperty)}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button onClick={onClose} style={buttonStyle}>Close</button>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this node?')) {
              onDelete && onDelete();
              onClose();
            }
          }}
          style={{
            ...buttonStyle,
            backgroundColor: '#ff3b30',
            color: 'white'
          }}
        >
          🗑️ Delete Node
        </button>
      </div>
    </div>
  );
}

// Basic styling for the panel
const panelStyle = {
  position: 'absolute',
  right: '20px',
  top: '20px',
  background: '#ffffff',
  border: '2px solid #1976d2',
  borderRadius: '8px',
  padding: '20px',
  zIndex: 1001, // Higher than top-right-panel
  minWidth: '250px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 'bold',
  color: '#333',
};

const selectStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  boxSizing: 'border-box', // Important for padding and width
};

const buttonStyle = {
  padding: '10px 15px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#1976d2',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
};

export default PropertiesPanel;
