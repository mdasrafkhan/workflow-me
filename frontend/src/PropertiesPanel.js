import React from 'react';

function PropertiesPanel({ node, onChange, onClose }) {
  if (!node) {
    return null; // Or a placeholder message
  }

  let options = [];
  let label = '';
  let currentValue = node.data?.selected || '';

  if (node.type === 'subscriber') {
    options = ['payment', 'created_at'];
    label = 'Select Property';
  } else if (node.type === 'operator') {
    options = ['<', '>', '<=', '>=', 'empty'];
    label = 'Select Operator';
  } else if (node.type === 'action') {
    options = ['delete', 'send_mail'];
    label = 'Select Action';
  } else {
    // For other node types or if type is not recognized
    return (
      <div style={panelStyle}>
        <h3>Node Properties</h3>
        <p>No properties available for this node type.</p>
        <button onClick={onClose} style={buttonStyle}>Close</button>
      </div>
    );
  }

  const handleChange = (e) => {
    const selectedValue = e.target.value;
    onChange({ selected: selectedValue });
    // Optionally, you can also update the label of the node here if needed
    // For example: onChange({ selected: selectedValue, label: `${node.type} (${selectedValue})` });
  };

  return (
    <div style={panelStyle}>
      <h3>Edit {node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node</h3>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="property-select" style={labelStyle}>{label}:</label>
        <select
          id="property-select"
          value={currentValue}
          onChange={handleChange}
          style={selectStyle}
        >
          <option value="">--Please choose an option--</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <button onClick={onClose} style={buttonStyle}>Close</button>
    </div>
  );
}

// Basic styling for the panel
const panelStyle = {
  position: 'absolute',
  right: '20px',
  top: '80px', // Adjust based on your header/toolbar height
  background: '#ffffff',
  border: '2px solid #1976d2',
  borderRadius: '8px',
  padding: '20px',
  zIndex: 10,
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
