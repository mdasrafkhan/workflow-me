import React, { useState } from "react";
import { NodeRegistry } from "./core/NodeRegistry";

const Sidebar = () => {
  const [draggedType, setDraggedType] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set([]));

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
    setDraggedType(nodeType);
  };

  const onDragEnd = () => {
    setDraggedType(null);
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get trigger nodes grouped by subcategory
  const getTriggerNodesBySubcategory = () => {
    const triggerNodes = NodeRegistry.getNodeTypesByCategory("Triggers");
    const grouped = {};

    triggerNodes.forEach((nodeType) => {
      if (nodeType.subcategory) {
        if (!grouped[nodeType.subcategory]) {
          grouped[nodeType.subcategory] = [];
        }
        grouped[nodeType.subcategory].push(nodeType);
      }
    });

    return grouped;
  };

  const triggerSubcategories = getTriggerNodesBySubcategory();
  const allCategories = NodeRegistry.getCategories();

  return (
    <aside className="sidebar-nodes">
      <div className="description">Drag nodes to canvas</div>

      {allCategories.map((category) => {
        if (category === "Triggers") {
          // Special handling for Triggers category
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="node-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                <h4>{category}</h4>
                <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
              </div>

              {isExpanded && (
                <div className="category-content">
                  {/* Subscriptions and Newsletters directly under Triggers */}
                  {/* Subscriptions */}
                  <div
                    className={`dndnode subscription-trigger ${
                      draggedType === "subscription-trigger" ? "dragging" : ""
                    }`}
                    onDragStart={(e) => onDragStart(e, "subscription-trigger")}
                    onDragEnd={onDragEnd}
                    draggable
                    title="Triggers when a user buys a subscription"
                  >
                    <span
                      className="icon"
                      role="img"
                      aria-label="subscription-trigger"
                    >
                      🚀
                    </span>
                    <span className="label">Subscriptions</span>
                  </div>

                  {/* Newsletters */}
                  <div
                    className={`dndnode newsletter-trigger ${
                      draggedType === "newsletter-trigger" ? "dragging" : ""
                    }`}
                    onDragStart={(e) => onDragStart(e, "newsletter-trigger")}
                    onDragEnd={onDragEnd}
                    draggable
                    title="Triggers when a user signs up for newsletter"
                  >
                    <span
                      className="icon"
                      role="img"
                      aria-label="newsletter-trigger"
                    >
                      📬
                    </span>
                    <span className="label">Newsletters</span>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          // Regular category handling
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="node-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(category)}
              >
                <h4>{category}</h4>
                <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
              </div>

              {isExpanded && (
                <div className="category-content">
                  {NodeRegistry.getNodeTypesByCategory(category).map(
                    (nodeType) => (
                      <div
                        key={nodeType.type}
                        className={`dndnode ${nodeType.type} ${
                          draggedType === nodeType.type ? "dragging" : ""
                        }`}
                        onDragStart={(e) => onDragStart(e, nodeType.type)}
                        onDragEnd={onDragEnd}
                        draggable
                        title={nodeType.description}
                      >
                        <span
                          className="icon"
                          role="img"
                          aria-label={nodeType.type}
                        >
                          {nodeType.icon}
                        </span>
                        {nodeType.label}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        }
      })}
    </aside>
  );
};

export default Sidebar;
