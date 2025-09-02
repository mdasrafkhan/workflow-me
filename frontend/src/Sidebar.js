import React, { useState } from 'react';
import { NodeRegistry } from './core/NodeRegistry';

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

  // Generate node categories from NodeRegistry
  const categories = NodeRegistry.getCategories();

  return (
    <aside className="sidebar-nodes">
      <div className="description">Drag nodes to canvas</div>
      {categories.map(category => (
        <div key={category} className="node-category">
          <h4>{category}</h4>
          {NodeRegistry.getNodeTypesByCategory(category).map(nodeType => (
            <div
              key={nodeType.type}
              className={`dndnode ${nodeType.type} ${draggedType === nodeType.type ? 'dragging' : ''}`}
              onDragStart={(e) => onDragStart(e, nodeType.type)}
              onDragEnd={onDragEnd}
              draggable
              title={nodeType.description}
            >
              <span className="icon" role="img" aria-label={nodeType.type}>{nodeType.icon}</span>
              {nodeType.label}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
