import React from 'react';

function PropertiesPanel({ node, onChange, onClose }) {
  if (!node) {
    return null; // Or a placeholder message
  }

  let options = [];
  let label = '';
  let currentValue = node.data?.selected || '';

  if (node.type === 'subscription-trigger') {
    options = ['user_buys_subscription', 'subscription_renewed', 'subscription_cancelled'];
    label = 'Select Trigger Event';
  } else if (node.type === 'newsletter-trigger') {
    options = ['user_signs_up_newsletter', 'newsletter_opt_in', 'newsletter_import'];
    label = 'Select Trigger Event';
  } else if (node.type === 'product-condition') {
    options = ['basic', 'premium', 'enterprise', 'student', 'family'];
    label = 'Select Product Package';
  } else if (node.type === 'user-segment-condition') {
    options = ['new_user', 'returning_user', 'high_value', 'at_risk', 'engaged'];
    label = 'Select User Segment';
  } else if (node.type === 'delay-node') {
    options = ['1_hour', '1_day', '2_days', '3_days', '1_week', '2_weeks'];
    label = 'Select Delay Duration';
  } else if (node.type === 'random-delay-node') {
    options = ['1_3_days', '3_5_days', '1_2_weeks', '2_4_weeks'];
    label = 'Select Random Delay Range';
  } else if (node.type === 'welcome-email') {
    options = ['subscription_welcome', 'newsletter_welcome', 'premium_welcome', 'basic_welcome'];
    label = 'Select Welcome Email Template';
  } else if (node.type === 'cta-config') {
    options = ['check_out_latest_newsletter', 'explore_premium_features', 'start_free_trial', 'contact_support', 'custom'];
    label = 'Select Call to Action';
  } else if (node.type === 'newsletter-email') {
    options = ['weekly_newsletter', 'daily_digest', 'breaking_news', 'featured_content'];
    label = 'Select Newsletter Template';
  } else if (node.type === 'follow-up-email') {
    options = ['value_drop', 'engagement_boost', 're_engagement', 'upsell_offer'];
    label = 'Select Follow-up Template';
  } else if (node.type === 'split-node') {
    options = ['product_based', 'user_segment_based', 'time_based', 'behavior_based'];
    label = 'Select Split Logic';
  } else if (node.type === 'merge-node') {
    options = ['all_paths', 'first_complete', 'majority_complete', 'custom_logic'];
    label = 'Select Merge Logic';
  } else if (node.type === 'end-node') {
    options = ['workflow_complete', 'user_unsubscribed', 'max_emails_sent', 'error_occurred'];
    label = 'Select End Condition';
  } else if (node.type === 're-entry-rule') {
    options = ['once_only', 'once_per_product_package', 'once_per_user', 'unlimited'];
    label = 'Select Re-entry Rule';
  } else if (node.type === 'url-config') {
    options = ['product_package_24', 'product_package_128', 'newsletter_integration_5', 'admin_dashboard', 'custom'];
    label = 'Select Admin URL';
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
