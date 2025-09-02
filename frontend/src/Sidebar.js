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
      <div className="description">Drag these nodes to the canvas</div>
      <div
        className={`dndnode subscriber ${draggedType === 'subscriber' ? 'dragging' : ''}`}
        onDragStart={(e) => onDragStart(e, 'subscriber')}
        onDragEnd={onDragEnd}
        draggable
      >
        <span className="icon" role="img" aria-label="subscriber">👤</span>
        Subscriber
      </div>
      <div
        className={`dndnode operator ${draggedType === 'operator' ? 'dragging' : ''}`}
        onDragStart={(e) => onDragStart(e, 'operator')}
        onDragEnd={onDragEnd}
        draggable
      >
        <span className="icon" role="img" aria-label="operator">⚙️</span>
        Operator
      </div>
      <div
        className={`dndnode action ${draggedType === 'action' ? 'dragging' : ''}`}
        onDragStart={(e) => onDragStart(e, 'action')}
        onDragEnd={onDragEnd}
        draggable
      >
        <span className="icon" role="img" aria-label="action">🚀</span>
        Action
      </div>
    </aside>
  );
};

export default Sidebar;
