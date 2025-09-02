import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, { addEdge, ReactFlowProvider, Handle, applyNodeChanges, applyEdgeChanges, ConnectionLineType } from 'reactflow';
import 'reactflow/dist/style.css';
import CustomEdge from './components/CustomEdge';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel'; // Import the new PropertiesPanel
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import WorkflowToJsonLogicConverter from './utils/workflowToJsonLogic';
import './App.css';

const initialNodes = [];
const initialEdges = [];

// Custom edge types - defined outside component to prevent recreation
const edgeTypes = {
  custom: CustomEdge,
};

// Custom node renderer - defined outside component to prevent recreation
const createNodeTypes = (setSelectedNodeId) => {
  // Common node style generator
  const createNodeStyle = (color) => ({
    padding: 12,
    borderRadius: 8,
    background: '#fff',
    border: `2px solid ${color}`,
    minWidth: 120,
    maxWidth: 120,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: `0 2px 8px ${color}20`,
    cursor: 'grab',
    userSelect: 'none'
  });

  // Common handle style generator
  const createHandleStyle = (color) => ({
    background: color,
    width: 12,
    height: 12,
    border: '2px solid white',
    boxShadow: `0 0 0 1px ${color}`
  });

  // Common node component generator
  const createNodeComponent = (icon, label, color, data, id, setSelectedNodeId) => (
    <div
      style={createNodeStyle(color)}
      onClick={() => setSelectedNodeId(id)}
    >
      <span style={{ fontSize: 24, marginBottom: 4 }}>{icon}</span>
      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{label}</span>
      {data.selected && <span style={{ fontSize: '12px', color: '#555', marginTop: 4 }}>{data.selected}</span>}
      <Handle
        type="source"
        position="right"
        id="right"
        style={createHandleStyle(color)}
        isConnectable={true}
      />
      <Handle
        type="target"
        position="left"
        id="left"
        style={createHandleStyle(color)}
        isConnectable={true}
      />
    </div>
  );

  return {
    // Trigger Nodes
    'subscription-trigger': ({ data, id, ...rest }) =>
      createNodeComponent('🚀', 'Subscription', '#1976d2', data, id, setSelectedNodeId),

    'newsletter-trigger': ({ data, id, ...rest }) =>
      createNodeComponent('📬', 'Newsletter', '#1976d2', data, id, setSelectedNodeId),

    // Condition Nodes
    'product-condition': ({ data, id, ...rest }) =>
      createNodeComponent('⚖️', 'Product', '#d97706', data, id, setSelectedNodeId),

    'user-segment-condition': ({ data, id, ...rest }) =>
      createNodeComponent('🎯', 'Segment', '#d97706', data, id, setSelectedNodeId),

    // Timing Nodes
    'delay-node': ({ data, id, ...rest }) =>
      createNodeComponent('⏰', 'Delay', '#9c27b0', data, id, setSelectedNodeId),

    'random-delay-node': ({ data, id, ...rest }) =>
      createNodeComponent('🎲', 'Random Delay', '#9c27b0', data, id, setSelectedNodeId),

    // Email Action Nodes
    'welcome-email': ({ data, id, ...rest }) =>
      createNodeComponent('👋', 'Welcome', '#d32f2f', data, id, setSelectedNodeId),

    'newsletter-email': ({ data, id, ...rest }) =>
      createNodeComponent('📧', 'Newsletter', '#d32f2f', data, id, setSelectedNodeId),

    'follow-up-email': ({ data, id, ...rest }) =>
      createNodeComponent('🔄', 'Follow-up', '#d32f2f', data, id, setSelectedNodeId),

    'cta-config': ({ data, id, ...rest }) =>
      createNodeComponent('🎯', 'CTA', '#e91e63', data, id, setSelectedNodeId),

    'url-config': ({ data, id, ...rest }) =>
      createNodeComponent('🔗', 'URL', '#795548', data, id, setSelectedNodeId),

    // Flow Control Nodes
    'split-node': ({ data, id, ...rest }) =>
      createNodeComponent('🔀', 'Split', '#4caf50', data, id, setSelectedNodeId),

    'merge-node': ({ data, id, ...rest }) =>
      createNodeComponent('🔗', 'Merge', '#4caf50', data, id, setSelectedNodeId),

    're-entry-rule': ({ data, id, ...rest }) =>
      createNodeComponent('🔄', 'Re-entry', '#ff9800', data, id, setSelectedNodeId),

    'end-node': ({ data, id, ...rest }) =>
      createNodeComponent('🏁', 'End', '#607d8b', data, id, setSelectedNodeId),
  };
};

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [edges, setEdges] = useState(initialEdges);

  // Memoize nodeTypes to prevent recreation
  const nodeTypes = useMemo(() => createNodeTypes(setSelectedNodeId), []);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [layoutType, setLayoutType] = useState('hierarchical'); // 'hierarchical', 'horizontal', 'vertical'
  const [jsonLogicRule, setJsonLogicRule] = useState(null);
  const [showJsonLogic, setShowJsonLogic] = useState(false);
  const reactFlowWrapper = useRef(null);

  useEffect(() => {
    axios.get('/api/workflows').then(res => setWorkflows(res.data));
  }, []);

  // Generate JsonLogic when nodes or edges change
  useEffect(() => {
    if (nodes.length > 0) {
      const rule = WorkflowToJsonLogicConverter.convertWorkflow(nodes, edges);
      setJsonLogicRule(rule);
    } else {
      setJsonLogicRule(null);
    }
  }, [nodes, edges]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [connectingNodeId, setConnectingNodeId] = useState(null);

  const onConnectStart = useCallback((_, { nodeId, handleType }) => {
    if (handleType === 'source') {
      setConnectingNodeId(nodeId);
    }
  }, []);

  const onConnectStop = useCallback(() => {
    setConnectingNodeId(null);
  }, []);

  const onConnectEnd = useCallback(
    (event) => {
      if (!event.target || !connectingNodeId) return;

      const targetIsPane = event.target.classList.contains('react-flow__pane');

      if (targetIsPane) {
        let position = { x: 0, y: 0 };
        if (reactFlowInstance) {
             position = reactFlowInstance.project({ x: event.clientX, y: event.clientY });
        } else {
             const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
             position = {
               x: event.clientX - left,
               y: event.clientY - top,
             };
        }

        const newNode = {
          id: uuidv4(),
          position,
          data: { label: 'New node' },
          type: 'operator',
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({ id: uuidv4(), source: connectingNodeId, target: newNode.id })
        );
      }
      setConnectingNodeId(null);
    },
    [connectingNodeId, reactFlowInstance]
  );

  // Enhanced drag and drop handlers
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

    const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      try {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

        // Calculate position relative to the React Flow pane
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNodeId = uuidv4();
        const newNode = {
          id: newNodeId,
          type,
          position,
          data: { label: `${type}` },
          draggable: true,
          selectable: true,
          deletable: true,
        };

        setNodes((nds) => [...nds, newNode]);

        // Auto-connect to nearby nodes or selected node
        let connected = false;

        // If there's a selected node, create an edge from it to the new node
        if (selectedNodeId) {
          const newEdge = {
            id: `e${selectedNodeId}-${newNodeId}`,
            source: selectedNodeId,
            target: newNodeId,
            type: 'custom',
            markerEnd: 'edge-circle',
            style: { stroke: '#2a8af6', strokeWidth: 3 }
          };

          setEdges((eds) => addEdge(newEdge, eds));
          connected = true;
        } else if (nodes.length > 0) {
          // If no node is selected but there are existing nodes, connect to the last one
          const lastNode = nodes[nodes.length - 1];
          const newEdge = {
            id: `e${lastNode.id}-${newNodeId}`,
            source: lastNode.id,
            target: newNodeId,
            type: 'custom',
            markerEnd: 'edge-circle',
            style: { stroke: '#2a8af6', strokeWidth: 3 }
          };

          setEdges((eds) => addEdge(newEdge, eds));
          connected = true;
        }

        // Auto-select the newly created node
        setSelectedNodeId(newNodeId);
      } catch (error) {
        alert('Failed to drop node. Please try again.');
      }
    },
    [reactFlowInstance, selectedNodeId]
  );

  const saveWorkflow = () => {
    const currentName = selectedWorkflow?.name || '';
    const newName = prompt('Enter workflow name:', currentName);

    if (newName === null) return; // User cancelled

    if (!newName.trim()) {
      alert('Workflow name cannot be empty');
      return;
    }

    // Only include id if we're updating an existing workflow
    const payload = {
      ...(selectedWorkflow?.id && { id: selectedWorkflow.id }), // Only include id if updating
      name: newName.trim(),
      nodes: nodes, // Save visual nodes
      edges: edges, // Save visual edges
      jsonLogic: jsonLogicRule, // Save JsonLogic rule
    };

    console.log('Saving workflow:', {
      isUpdate: !!selectedWorkflow?.id,
      selectedWorkflowId: selectedWorkflow?.id,
      payload
    });

    axios.post('/api/workflows', payload).then(res => {
      setSelectedWorkflow(res.data);
      setWorkflows(list => {
        const exists = list.find(w => w.id === res.data.id);
        if (exists) return list.map(w => w.id === res.data.id ? res.data : w);
        return [...list, res.data];
      });
    }).catch(err => {
      alert('Failed to save workflow. Please try again.');
    });
  };

  // JsonLogic utility functions
  const testJsonLogic = () => {
    if (!jsonLogicRule) return;
    const result = WorkflowToJsonLogicConverter.testJsonLogic(jsonLogicRule);
    alert(`JsonLogic Test Result: ${result ? 'TRUE' : 'FALSE'}`);
  };

  const copyJsonLogic = () => {
    if (!jsonLogicRule) return;
    const jsonString = WorkflowToJsonLogicConverter.prettyPrint(jsonLogicRule);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert('JsonLogic copied to clipboard!');
    });
  };

  const loadWorkflow = wf => {
    setSelectedWorkflow(wf);
    // Load visual workflow data
    setNodes(wf.nodes || []);
    setEdges(wf.edges || []);
  };

  const deleteWorkflow = (id) => {
    axios.delete(`/api/workflows/${id}`).then(() => {
      setWorkflows(list => list.filter(wf => wf.id !== id));
      if (selectedWorkflow && selectedWorkflow.id === id) {
        setSelectedWorkflow(null);
        setNodes([]);
        setEdges([]);
      }
    }).catch(err => {
      alert('Failed to delete workflow. Please try again.');
    });
  };

  // Auto-layout functions
  const applyAutoLayout = useCallback((layout = layoutType) => {
    if (nodes.length === 0) return;

    const nodeWidth = 140; // Node width + spacing
    const nodeHeight = 100; // Node height + spacing
    const horizontalSpacing = 200;
    const verticalSpacing = 150;

    let newNodes = [...nodes];

    switch (layout) {
      case 'hierarchical':
        newNodes = applyHierarchicalLayout(nodes, edges, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing);
        break;
      case 'horizontal':
        newNodes = applyHorizontalLayout(nodes, nodeWidth, horizontalSpacing);
        break;
      case 'vertical':
        newNodes = applyVerticalLayout(nodes, nodeHeight, verticalSpacing);
        break;
      default:
        newNodes = applyHierarchicalLayout(nodes, edges, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing);
    }

    setNodes(newNodes);

    // Fit the view to show all nodes after layout
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.1 });
      }
    }, 100);
  }, [nodes, edges, layoutType, reactFlowInstance]);

  const applyHierarchicalLayout = (nodes, edges, nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing) => {
    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node =>
      !edges.some(edge => edge.target === node.id)
    );

    if (rootNodes.length === 0) {
      // If no root nodes, use the first node
      rootNodes.push(nodes[0]);
    }

    const visited = new Set();
    const levels = new Map();
    const nodePositions = new Map();

    // BFS to assign levels
    const queue = rootNodes.map(node => ({ node, level: 0 }));

    while (queue.length > 0) {
      const { node, level } = queue.shift();

      if (visited.has(node.id)) continue;
      visited.add(node.id);

      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(node);

      // Add children to queue
      const children = edges
        .filter(edge => edge.source === node.id)
        .map(edge => nodes.find(n => n.id === edge.target))
        .filter(Boolean);

      children.forEach(child => {
        if (!visited.has(child.id)) {
          queue.push({ node: child, level: level + 1 });
        }
      });
    }

    // Position nodes within each level
    levels.forEach((levelNodes, level) => {
      const startX = 100; // Start from positive coordinates
      const centerOffset = (levelNodes.length - 1) * horizontalSpacing / 2;

      levelNodes.forEach((node, index) => {
        const x = startX + (index * horizontalSpacing) - centerOffset;
        const y = 100 + (level * verticalSpacing); // Start from positive coordinates

        nodePositions.set(node.id, { x, y });
      });
    });

    // Apply positions
    return nodes.map(node => {
      const position = nodePositions.get(node.id) || { x: 0, y: 0 };
      return {
        ...node,
        position
      };
    });
  };

  const applyHorizontalLayout = (nodes, nodeWidth, horizontalSpacing) => {
    const startX = 100; // Start from positive coordinates
    const centerOffset = (nodes.length - 1) * horizontalSpacing / 2;

    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: startX + (index * horizontalSpacing) - centerOffset,
        y: 200 // Center vertically
      }
    }));
  };

  const applyVerticalLayout = (nodes, nodeHeight, verticalSpacing) => {
    const startY = 100; // Start from positive coordinates
    const centerOffset = (nodes.length - 1) * verticalSpacing / 2;

    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: 300, // Center horizontally
        y: startY + (index * verticalSpacing) - centerOffset
      }
    }));
  };

  const cycleLayoutType = () => {
    const types = ['hierarchical', 'horizontal', 'vertical'];
    const currentIndex = types.indexOf(layoutType);
    const nextType = types[(currentIndex + 1) % types.length];
    setLayoutType(nextType);
    applyAutoLayout(nextType);
  };

  // Auto-apply layout when nodes are added (but not when manually moved)
  useEffect(() => {
    if (nodes.length > 0 && nodes.length <= 10) { // Only auto-layout for small workflows
      const hasManualPositions = nodes.some(node =>
        Math.abs(node.position.x) > 50 || Math.abs(node.position.y) > 50
      );

      if (!hasManualPositions) {
        // Small delay to ensure nodes are rendered
        setTimeout(() => applyAutoLayout(), 100);
      }
    }
  }, [nodes.length, applyAutoLayout]);

  // Keyboard shortcut for auto-layout (Ctrl/Cmd + L)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        applyAutoLayout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyAutoLayout]);

  return (
    <ReactFlowProvider>
      <div className="app">
        {/* Top Right Node Selection Panel */}
        <div className="top-right-panel">
          <Sidebar />
        </div>

        {/* Main Canvas Area */}
        <div className="canvas-area">
          <div
            className={`canvas ${isDragOver ? 'drag-over' : ''}`}
            ref={reactFlowWrapper}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onConnect={onConnect}
              onNodesChange={(changes) => setNodes((nds) => applyNodeChanges(changes, nds))}
              onEdgesChange={(changes) => setEdges((eds) => applyEdgeChanges(changes, eds))}
              onInit={setReactFlowInstance}
              onConnectStart={onConnectStart}
              onConnectStop={onConnectStop}
              onConnectEnd={onConnectEnd}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineStyle={{ stroke: '#2a8af6', strokeWidth: 3 }}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              defaultEdgeOptions={{
                type: 'custom',
                markerEnd: 'edge-circle',
                style: { stroke: '#2a8af6', strokeWidth: 3 }
              }}
            >
              <svg>
                <defs>
                  <linearGradient id="edge-gradient">
                    <stop offset="0%" stopColor="#ae53ba" />
                    <stop offset="100%" stopColor="#2a8af6" />
                  </linearGradient>

                  <marker
                    id="edge-circle"
                    viewBox="-5 -5 10 10"
                    refX="0"
                    refY="0"
                    markerUnits="strokeWidth"
                    markerWidth="10"
                    markerHeight="10"
                    orient="auto"
                  >
                    <circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
                  </marker>
                </defs>
              </svg>
            </ReactFlow>
          </div>
          {selectedNodeId && (
            <PropertiesPanel
              node={nodes.find(n => n.id === selectedNodeId)}
              onChange={updatedData => {
                setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updatedData } } : n));
              }}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>

        {/* Bottom Workflow Controls Panel */}
        <div className="bottom-panel">
          <div className="workflow-controls">
            <div className="workflow-actions">
              <button onClick={() => {
                setNodes([]);
                setEdges([]);
                setSelectedWorkflow(null);
              }}>New</button>
              <button onClick={saveWorkflow}>Save Workflow</button>
              <button
                onClick={async () => {
                  try {
                    const response = await axios.post('/api/workflows/migrate');
                    alert(response.data.message);
                    const workflowsResponse = await axios.get('/api/workflows');
                    setWorkflows(workflowsResponse.data);
                  } catch (error) {
                    alert('Migration failed: ' + error.message);
                  }
                }}
                style={{
                  backgroundColor: '#34c759',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🔄 Migrate
              </button>
            </div>

            <div className="workflow-management">
              <h3>Saved Workflows</h3>
              {workflows.length > 0 ? (
                <div className="workflow-selector">
                  <select
                    value={selectedWorkflow?.id || ''}
                    onChange={(e) => {
                      const workflowId = parseInt(e.target.value);
                      const workflow = workflows.find(wf => wf.id === workflowId);
                      if (workflow) loadWorkflow(workflow);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e5e7',
                      backgroundColor: '#ffffff',
                      fontSize: '14px',
                      color: '#1d1d1f',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">Select a workflow...</option>
                    {workflows.map(wf => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name} (ID: {wf.id})
                      </option>
                    ))}
                  </select>

                  {selectedWorkflow && (
                    <div className="workflow-buttons">
                      <button
                        onClick={() => loadWorkflow(selectedWorkflow)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: '#007aff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}
                      >
                        📂 Load
                      </button>
                      <button
                        onClick={() => deleteWorkflow(selectedWorkflow.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          backgroundColor: '#ff3b30',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  fontSize: '12px',
                  color: '#999',
                  textAlign: 'center',
                  padding: '16px',
                  backgroundColor: '#f5f5f7',
                  borderRadius: '6px'
                }}>
                  No workflows saved yet
                </div>
              )}
            </div>

            <div className="layout-controls">
              <h3>Layout</h3>
              <button onClick={applyAutoLayout}>
                📐 Apply Layout
              </button>
              <button onClick={cycleLayoutType}>
                🔄 {layoutType.charAt(0).toUpperCase() + layoutType.slice(1)}
              </button>
              <div style={{ fontSize: '10px', color: '#999', textAlign: 'center' }}>
                Shortcut: Ctrl/Cmd + L
              </div>
            </div>

            <div className="jsonlogic-controls">
              <h3>JsonLogic</h3>
              <button
                onClick={() => setShowJsonLogic(!showJsonLogic)}
                style={{ fontSize: '12px' }}
              >
                {showJsonLogic ? '🔽' : '▶️'} {showJsonLogic ? 'Hide' : 'Show'} Logic
              </button>
              {showJsonLogic && jsonLogicRule && (
                <div className="jsonlogic-actions">
                  <button onClick={testJsonLogic} style={{ fontSize: '11px' }}>
                    🧪 Test Logic
                  </button>
                  <button onClick={copyJsonLogic} style={{ fontSize: '11px' }}>
                    📋 Copy Logic
                  </button>
                </div>
              )}
            </div>
          </div>

          {showJsonLogic && jsonLogicRule && (
            <div className="jsonlogic-display">
              <div style={{
                fontSize: '10px',
                color: '#666',
                backgroundColor: '#f5f5f7',
                padding: '8px',
                borderRadius: '4px',
                maxHeight: '150px',
                overflow: 'auto',
                fontFamily: 'monospace'
              }}>
                <pre>{WorkflowToJsonLogicConverter.prettyPrint(jsonLogicRule)}</pre>
              </div>
            </div>
          )}

          {showJsonLogic && !jsonLogicRule && (
            <div style={{ fontSize: '11px', color: '#999', textAlign: 'center' }}>
              No workflow logic yet
            </div>
          )}

          <div style={{
            fontSize: '11px',
            color: '#666',
            backgroundColor: '#f0f8ff',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #007aff'
          }}>
            ✅ Visual workflows are stored separately from JsonLogic rules. Both are maintained for editing and execution.
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

// NodeEditor component is now replaced by PropertiesPanel.js

export default App;
