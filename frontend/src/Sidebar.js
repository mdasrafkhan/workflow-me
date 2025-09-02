import React, { useState } from 'react';

const Sidebar = () => {
  const [draggedType, setDraggedType] = useState(null);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedType(nodeType);
  };

  const onDragEnd = () => {
    setDraggedType(null);
  };

  return (
    <aside className="sidebar-nodes">
      <div className="description">Drag nodes to canvas</div>
      <div className="node-category">
        <h4>Triggers</h4>
        <div
          className={`dndnode subscription-trigger ${draggedType === 'subscription-trigger' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'subscription-trigger')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="subscription-trigger">🚀</span>
          Subscription Trigger
        </div>
        <div
          className={`dndnode newsletter-trigger ${draggedType === 'newsletter-trigger' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'newsletter-trigger')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="newsletter-trigger">📬</span>
          Newsletter Trigger
        </div>
      </div>

      <div className="node-category">
        <h4>Conditions</h4>
        <div
          className={`dndnode product-condition ${draggedType === 'product-condition' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'product-condition')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="product-condition">⚖️</span>
          Product Condition
        </div>
        <div
          className={`dndnode user-segment-condition ${draggedType === 'user-segment-condition' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'user-segment-condition')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="user-segment-condition">🎯</span>
          User Segment
        </div>
      </div>

      <div className="node-category">
        <h4>Timing</h4>
        <div
          className={`dndnode delay-node ${draggedType === 'delay-node' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'delay-node')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="delay-node">⏰</span>
          Delay
        </div>
        <div
          className={`dndnode random-delay-node ${draggedType === 'random-delay-node' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'random-delay-node')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="random-delay-node">🎲</span>
          Random Delay
        </div>
      </div>

      <div className="node-category">
        <h4>Actions</h4>
        <div
          className={`dndnode welcome-email ${draggedType === 'welcome-email' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'welcome-email')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="welcome-email">👋</span>
          Welcome Email
        </div>
        <div
          className={`dndnode newsletter-email ${draggedType === 'newsletter-email' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'newsletter-email')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="newsletter-email">📧</span>
          Newsletter Email
        </div>
        <div
          className={`dndnode follow-up-email ${draggedType === 'follow-up-email' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'follow-up-email')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="follow-up-email">🔄</span>
          Follow-up Email
        </div>
        <div
          className={`dndnode cta-config ${draggedType === 'cta-config' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'cta-config')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="cta-config">🎯</span>
          CTA Config
        </div>
        <div
          className={`dndnode url-config ${draggedType === 'url-config' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'url-config')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="url-config">🔗</span>
          URL Config
        </div>
      </div>

      <div className="node-category">
        <h4>Flow Control</h4>
        <div
          className={`dndnode split-node ${draggedType === 'split-node' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'split-node')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="split-node">🔀</span>
          Split
        </div>
        <div
          className={`dndnode merge-node ${draggedType === 'merge-node' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'merge-node')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="merge-node">🔗</span>
          Merge
        </div>
        <div
          className={`dndnode re-entry-rule ${draggedType === 're-entry-rule' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 're-entry-rule')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="re-entry-rule">🔄</span>
          Re-entry Rule
        </div>
        <div
          className={`dndnode end-node ${draggedType === 'end-node' ? 'dragging' : ''}`}
          onDragStart={(e) => onDragStart(e, 'end-node')}
          onDragEnd={onDragEnd}
          draggable
        >
          <span className="icon" role="img" aria-label="end-node">🏁</span>
          End
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
