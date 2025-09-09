import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import ReactFlow, {
  addEdge,
  ReactFlowProvider,
  Handle,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomEdge from "./components/CustomEdge";
import Sidebar from "./Sidebar";
import PropertiesPanel from "./PropertiesPanel"; // Import the new PropertiesPanel
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { NodeRegistry } from "./core/NodeRegistry";
import { JsonLogicConverter } from "./core/JsonLogicConverter";
import { WorkflowValidator } from "./core/WorkflowValidator";
import { WorkflowTemplates, initializeDefaultTemplates } from "./core/WorkflowTemplates";
import WorkflowToJsonLogicConverter from "./utils/workflowToJsonLogic";
import "./App.css";

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
    background: "#fff",
    border: `2px solid ${color}`,
    minWidth: 120,
    maxWidth: 120,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: `0 2px 8px ${color}20`,
    cursor: "grab",
    userSelect: "none",
  });

  // Common handle style generator
  const createHandleStyle = (color) => ({
    background: color,
    width: 12,
    height: 12,
    border: "2px solid white",
    boxShadow: `0 0 0 1px ${color}`,
  });

  // Common node component generator
  const createNodeComponent = (
    icon,
    label,
    color,
    data,
    id,
    setSelectedNodeId,
    isSelected
  ) => (
    <div
      style={{
        ...createNodeStyle(color),
        border: isSelected ? `3px solid #007aff` : `2px solid ${color}`,
        boxShadow: isSelected
          ? `0 0 0 2px rgba(0,122,255,0.2), 0 2px 8px ${color}20`
          : `0 2px 8px ${color}20`,
      }}
      onClick={() => setSelectedNodeId(id)}
    >
      <span style={{ fontSize: 24, marginBottom: 4 }}>{icon}</span>
      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{label}</span>

      {/* Show property values below the node label */}
      {(() => {
        // For trigger nodes, show triggerEvent
        if (data.triggerEvent) {
          return (
            <span
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: 4,
                textAlign: "center",
                fontStyle: "italic",
                maxWidth: "100px",
                wordWrap: "break-word",
              }}
            >
              {data.triggerEvent
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          );
        }

        // For other nodes, show the first property value that's not 'label'
        const propertyKey = Object.keys(data).find(
          (key) => key !== "label" && data[key] && typeof data[key] === "string"
        );
        if (propertyKey) {
          return (
            <span
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: 4,
                textAlign: "center",
                fontStyle: "italic",
                maxWidth: "100px",
                wordWrap: "break-word",
              }}
            >
              {data[propertyKey]
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          );
        }

        // Fallback to selected value
        if (data.selected) {
          return (
            <span style={{ fontSize: "12px", color: "#555", marginTop: 4 }}>
              {data.selected}
            </span>
          );
        }

        return null;
      })()}
      <Handle
        type="source"
        position="bottom"
        id="bottom"
        style={createHandleStyle(color)}
        isConnectable={true}
      />
      <Handle
        type="target"
        position="top"
        id="top"
        style={createHandleStyle(color)}
        isConnectable={true}
      />
    </div>
  );

  // Generate node types from NodeRegistry
  const nodeTypes = {};
  NodeRegistry.getAllNodeTypes().forEach((nodeType, type) => {
    nodeTypes[type] = ({ data, id, selected, ...rest }) =>
      createNodeComponent(
        nodeType.icon,
        nodeType.label,
        nodeType.color,
        data,
        id,
        setSelectedNodeId,
        selected
      );
  });

  return nodeTypes;
};

function App() {
  const [nodes, setNodes] = useState(initialNodes);

  // Safe setNodes wrapper to catch any errors
  const safeSetNodes = useCallback((newNodes) => {
    try {
      if (Array.isArray(newNodes)) {
        setNodes(newNodes);
      } else {
        console.error('setNodes called with non-array:', newNodes);
        setNodes([]);
      }
    } catch (error) {
      console.error('Error in setNodes:', error);
      setNodes([]);
    }
  }, []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [edges, setEdges] = useState(initialEdges);

  // Memoize nodeTypes to prevent recreation
  const nodeTypes = useMemo(() => createNodeTypes(setSelectedNodeId), []);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // Layout functionality removed - nodes now auto-align horizontally
  const [jsonLogicRule, setJsonLogicRule] = useState(null);
  const [showJsonLogic, setShowJsonLogic] = useState(false);
  const reactFlowWrapper = useRef(null);

  useEffect(() => {
    // Initialize default templates
    initializeDefaultTemplates();

    axios.get("/workflow/visual-workflows").then((res) => {
      console.log('Loaded workflows:', res.data);
      setWorkflows(res.data);

      // Auto-load the first workflow if there's only one
      if (res.data && res.data.length === 1) {
        console.log('Auto-loading single workflow:', res.data[0].name);
        loadWorkflow(res.data[0]);
      }
    }).catch(error => {
      console.error('Error loading workflows:', error);
    });
  }, []);

  // Generate JsonLogic when nodes or edges change
  useEffect(() => {
    if (nodes.length > 0) {
      const rule = JsonLogicConverter.convertWorkflow(nodes, edges);
      setJsonLogicRule(rule);
    } else {
      setJsonLogicRule(null);
    }
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [connectingNodeId, setConnectingNodeId] = useState(null);

  const onConnectStart = useCallback((_, { nodeId, handleType }) => {
    if (handleType === "source") {
      setConnectingNodeId(nodeId);
    }
  }, []);


  const onConnectEnd = useCallback(
    (event) => {
      // Reset connecting node
      setConnectingNodeId(null);

      if (!event.target || !connectingNodeId) return;

      const targetIsPane = event.target.classList.contains("react-flow__pane");

      if (targetIsPane) {
        let position = { x: 0, y: 0 };
        if (reactFlowInstance) {
          position = reactFlowInstance.project({
            x: event.clientX,
            y: event.clientY,
          });
        } else {
          const { top, left } =
            reactFlowWrapper.current.getBoundingClientRect();
          position = {
            x: event.clientX - left,
            y: event.clientY - top,
          };
        }

        const newNode = {
          id: uuidv4(),
          position,
          data: { label: "New node" },
          type: "operator",
        };

        setNodes((nds) => {
          try {
            return nds.concat(newNode);
          } catch (error) {
            console.error('Error adding connected node:', error);
            return nds;
          }
        });
        setEdges((eds) =>
          eds.concat({
            id: uuidv4(),
            source: connectingNodeId,
            target: newNode.id,
          })
        );
      }
      setConnectingNodeId(null);
    },
    [connectingNodeId, reactFlowInstance]
  );

  // Enhanced drag and drop handlers
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
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

      const type = event.dataTransfer.getData("application/reactflow");

      if (!type || !reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      try {
        const newNodeId = uuidv4();

        // Calculate horizontal alignment position
        const nodeWidth = 148; // Standard node width
        const horizontalSpacing = 200; // Space between nodes

        // Calculate the workflow's horizontal alignment line
        let baseY = 0; // Default Y position
        if (nodes.length > 0) {
          // Use the Y position of existing nodes to maintain horizontal alignment
          // If nodes are already aligned horizontally, use their Y position
          // If they're not aligned, use the Y position of the first node
          const existingYPositions = nodes.map(node => node.position.y);
          const isHorizontallyAligned = existingYPositions.every(y => Math.abs(y - existingYPositions[0]) < 10);

          if (isHorizontallyAligned) {
            // Use the existing horizontal line
            baseY = existingYPositions[0];
          } else {
            // Use the Y position of the first node to start a new horizontal line
            baseY = nodes[0].position.y;
          }
        }

        // Calculate X position based on number of existing nodes
        const xPosition = nodes.length * horizontalSpacing;
        const position = { x: xPosition, y: baseY };

        // Get node type configuration to set proper data
        const nodeType = NodeRegistry.getNodeType(type);
        let nodeData = { label: nodeType?.label || type };

        // Set default values for trigger nodes
        if (nodeType?.properties) {
          nodeType.properties.forEach((property) => {
            if (property.default !== undefined) {
              nodeData[property.key] = property.default;
            }
          });
        }

        const newNode = {
          id: newNodeId,
          type,
          position,
          data: nodeData,
          draggable: true,
          selectable: true,
          deletable: true,
        };

        setNodes((nds) => {
          try {
            return [...nds, newNode];
          } catch (error) {
            console.error('Error adding new node:', error);
            return nds;
          }
        });

        // Auto-connect to nearby nodes or selected node
        let connected = false;

        // If there's a selected node, create an edge from it to the new node
        if (selectedNodeId) {
          const newEdge = {
            id: `e${selectedNodeId}-${newNodeId}`,
            source: selectedNodeId,
            target: newNodeId,
            type: "custom",
            markerEnd: "edge-circle",
            style: { stroke: "#2a8af6", strokeWidth: 3 },
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
            type: "custom",
            markerEnd: "edge-circle",
            style: { stroke: "#2a8af6", strokeWidth: 3 },
          };

          setEdges((eds) => addEdge(newEdge, eds));
          connected = true;
        }

        // Auto-select the newly created node
        setSelectedNodeId(newNodeId);
      } catch (error) {
        alert("Failed to drop node. Please try again.");
      }
    },
    [reactFlowInstance, selectedNodeId, nodes]
  );

  const saveWorkflow = () => {
    const currentName = selectedWorkflow?.name || "";
    const newName = prompt("Enter workflow name:", currentName);

    if (newName === null) return; // User cancelled

    if (!newName.trim()) {
      alert("Workflow name cannot be empty");
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

    console.log("Saving workflow:", {
      isUpdate: !!selectedWorkflow?.id,
      selectedWorkflowId: selectedWorkflow?.id,
      payload,
    });

    axios
      .post("/workflow/visual-workflows", payload)
      .then((res) => {
        setSelectedWorkflow(res.data);
        setWorkflows((list) => {
          const exists = list.find((w) => w.id === res.data.id);
          if (exists)
            return list.map((w) => (w.id === res.data.id ? res.data : w));
          return [...list, res.data];
        });
      })
      .catch((err) => {
        alert("Failed to save workflow. Please try again.");
      });
  };

  // JsonLogic utility functions
  const testJsonLogic = () => {
    if (!jsonLogicRule) return;
    const testResult = JsonLogicConverter.testRule(jsonLogicRule);

    if (testResult.success) {
      alert(
        `JsonLogic Test Result: ${JSON.stringify(testResult.result, null, 2)}`
      );
    } else {
      alert(`JsonLogic Test Error: ${testResult.error}`);
    }
  };

  const copyJsonLogic = () => {
    if (!jsonLogicRule) return;
    const jsonString = JSON.stringify(jsonLogicRule, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert("JsonLogic copied to clipboard!");
    });
  };

  const validateWorkflow = () => {
    const validationResult = WorkflowValidator.validateWorkflow(nodes, edges);
    const summary = WorkflowValidator.getValidationSummary(validationResult);
    alert(summary);
  };

    const loadTemplate = (templateId) => {
    try {
      const workflow = WorkflowTemplates.createWorkflowFromTemplate(templateId);

      // Apply proper tree layout - main flow vertical, branches horizontal
      const nodeWidth = 200;
      const nodeHeight = 100;
      const verticalSpacing = 150;
      const horizontalSpacing = 300;
      const startX = 300;
      const startY = 100;

      // Create a map to track node positions
      const nodePositions = new Map();
      const processedNodes = new Set();

      // Find the root node (no incoming edges)
      const rootNode = workflow.nodes.find(node =>
        !workflow.edges.some(edge => edge.target === node.id)
      );

      if (!rootNode) {
        throw new Error('No root node found');
      }

      // Position root node
      nodePositions.set(rootNode.id, { x: startX, y: startY });
      processedNodes.add(rootNode.id);

      // Process nodes level by level
      const queue = [{ node: rootNode, level: 0, parentX: startX }];
      const levelMap = new Map(); // Track nodes by level

      while (queue.length > 0) {
        const { node, level, parentX } = queue.shift();

        // Find children of this node
        const children = workflow.edges
          .filter(edge => edge.source === node.id)
          .map(edge => workflow.nodes.find(n => n.id === edge.target))
          .filter(child => child && !processedNodes.has(child.id));

        if (children.length > 0) {
          // Check if this is a merge point (multiple parents pointing to same child)
          const isMergePoint = children.some(child =>
            workflow.edges.filter(edge => edge.target === child.id).length > 1
          );

          if (isMergePoint) {
            // For merge points, position children at the center
            children.forEach((child, index) => {
              const childX = startX; // Center all merge children
              const childY = startY + (level + 1) * verticalSpacing;

              nodePositions.set(child.id, { x: childX, y: childY });
              processedNodes.add(child.id);

              queue.push({
                node: child,
                level: level + 1,
                parentX: childX
              });
            });
          } else {
            // For regular branches, position children horizontally
            const childrenStartX = parentX - ((children.length - 1) * horizontalSpacing) / 2;

            children.forEach((child, index) => {
              const childX = childrenStartX + index * horizontalSpacing;
              const childY = startY + (level + 1) * verticalSpacing;

              nodePositions.set(child.id, { x: childX, y: childY });
              processedNodes.add(child.id);

              queue.push({
                node: child,
                level: level + 1,
                parentX: childX
              });
            });
          }
        }
      }

      // Apply positions to all nodes
      const treeNodes = workflow.nodes.map(node => {
        const position = nodePositions.get(node.id) || { x: 300, y: 100 };
        return {
          ...node,
          position: {
            x: position.x,
            y: position.y,
          },
        };
      });

      setNodes(treeNodes);
      setEdges(workflow.edges);
      setSelectedWorkflow(null); // Clear selected workflow

      alert(`Loaded template: ${workflow.name}`);
    } catch (error) {
      alert(`Failed to load template: ${error.message}`);
    }
  };

  const loadWorkflow = (wf) => {
    console.log('Loading workflow:', wf);
    console.log('Workflow nodes:', wf.nodes);
    console.log('Workflow edges:', wf.edges);
    setSelectedWorkflow(wf);
    // Load visual workflow data with position validation
    try {
      const nodes = (wf.nodes || []).map((node, index) => {
        // Ensure each node has all required React Flow properties
        const validatedNode = {
          id: node.id || `node-${index}`,
          type: node.type || 'default',
          data: node.data || { label: 'Node' },
          position: {
            x: node.position?.x || 300 + (index * 50),
            y: node.position?.y || 100 + (index * 50)
          },
          draggable: node.draggable !== false,
          selectable: node.selectable !== false,
          deletable: node.deletable !== false,
          ...node // Spread other properties
        };

        // Log warning if position was missing
        if (!node.position || typeof node.position.x === 'undefined' || typeof node.position.y === 'undefined') {
          console.warn(`Node ${node.id || index} missing position, added default position:`, validatedNode.position);
        }

        return validatedNode;
      });
      console.log('Validated nodes:', nodes);
      console.log('Setting nodes in React Flow...');
      safeSetNodes(nodes);
      setEdges(wf.edges || []);
      console.log('Workflow loaded successfully!');
    } catch (error) {
      console.error('Error loading workflow nodes:', error);
      safeSetNodes([]);
      setEdges([]);
    }
  };

  const deleteWorkflow = (id) => {
    axios
      .post(`/workflow/visual-workflows/${id}/delete`)
      .then(() => {
        setWorkflows((list) => list.filter((wf) => wf.id !== id));
        if (selectedWorkflow && selectedWorkflow.id === id) {
          setSelectedWorkflow(null);
          safeSetNodes([]);
          setEdges([]);
        }
        alert("Workflow deleted successfully!");
      })
      .catch((err) => {
        console.error("Delete error:", err);
        alert("Failed to delete workflow. Please try again.");
      });
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;

    if (window.confirm("Are you sure you want to delete this node?")) {
      // Remove the node
      setNodes(nodes.filter((node) => node.id !== selectedNodeId));

      // Remove all edges connected to this node
      setEdges(
        edges.filter(
          (edge) =>
            edge.source !== selectedNodeId && edge.target !== selectedNodeId
        )
      );

      // Clear selection
      setSelectedNodeId(null);

      // Show success message
      console.log("Node deleted successfully");
    }
  };

  // Layout functions removed - nodes now auto-align horizontally when dropped
  const applyHierarchicalLayout = (
    nodes,
    edges,
    nodeWidth,
    nodeHeight,
    horizontalSpacing,
    verticalSpacing
  ) => {
    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(
      (node) => !edges.some((edge) => edge.target === node.id)
    );

    if (rootNodes.length === 0) {
      // If no root nodes, use the first node
      rootNodes.push(nodes[0]);
    }

    const visited = new Set();
    const levels = new Map();
    const nodePositions = new Map();

    // BFS to assign levels
    const queue = rootNodes.map((node) => ({ node, level: 0 }));

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
        .filter((edge) => edge.source === node.id)
        .map((edge) => nodes.find((n) => n.id === edge.target))
        .filter(Boolean);

      children.forEach((child) => {
        if (!visited.has(child.id)) {
          queue.push({ node: child, level: level + 1 });
        }
      });
    }

    // Position nodes within each level
    levels.forEach((levelNodes, level) => {
      const startX = 100; // Start from positive coordinates
      const centerOffset = ((levelNodes.length - 1) * horizontalSpacing) / 2;

      levelNodes.forEach((node, index) => {
        const x = startX + index * horizontalSpacing - centerOffset;
        const y = 100 + level * verticalSpacing; // Start from positive coordinates

        nodePositions.set(node.id, { x, y });
      });
    });

    // Apply positions
    return nodes.map((node) => {
      const position = nodePositions.get(node.id) || { x: 0, y: 0 };
      return {
        ...node,
        position,
      };
    });
  };

  const applyHorizontalLayout = (nodes, nodeWidth, horizontalSpacing) => {
    const startX = 100; // Start from positive coordinates
    const centerOffset = ((nodes.length - 1) * horizontalSpacing) / 2;

    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: startX + index * horizontalSpacing - centerOffset,
        y: 200, // Center vertically
      },
    }));
  };

  const applyVerticalLayout = (nodes, nodeHeight, verticalSpacing) => {
    const startY = 100; // Start from positive coordinates
    const centerOffset = ((nodes.length - 1) * verticalSpacing) / 2;

    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: 300, // Center horizontally
        y: startY + index * verticalSpacing - centerOffset,
      },
    }));
  };

  // cycleLayoutType function removed - layout functionality no longer needed

  // Auto-alignment is now handled directly in onDrop function

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't delete node if user is typing in input fields
      const isTypingInInput = event.target.tagName === 'INPUT' ||
                             event.target.tagName === 'TEXTAREA' ||
                             event.target.contentEditable === 'true';

      // Delete selected node shortcut (Delete or Backspace)
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedNodeId &&
        !isTypingInInput
      ) {
        event.preventDefault();
        deleteSelectedNode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId]);

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
            className={`canvas ${isDragOver ? "drag-over" : ""}`}
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
              onNodesChange={(changes) => {
                try {
                  setNodes((nds) => applyNodeChanges(changes, nds));
                } catch (error) {
                  console.error('Error applying node changes:', error);
                }
              }}
              onEdgesChange={(changes) =>
                setEdges((eds) => applyEdgeChanges(changes, eds))
              }
              onInit={setReactFlowInstance}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setSelectedNodeId(node.id);
                // Show context menu or just select the node
              }}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineStyle={{ stroke: "#2a8af6", strokeWidth: 3 }}
              nodesDraggable={true}
              nodesConnectable={true}
              elementsSelectable={true}
              defaultEdgeOptions={{
                type: "custom",
                markerEnd: "edge-circle",
                style: { stroke: "#2a8af6", strokeWidth: 3 },
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
                    <circle
                      stroke="#2a8af6"
                      strokeOpacity="0.75"
                      r="2"
                      cx="0"
                      cy="0"
                    />
                  </marker>
                </defs>
              </svg>
            </ReactFlow>
          </div>
          {selectedNodeId && (
            <PropertiesPanel
              node={nodes.find((n) => n.id === selectedNodeId)}
              onChange={(updatedData) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === selectedNodeId
                      ? { ...n, data: { ...n.data, ...updatedData } }
                      : n
                  )
                );
              }}
              onClose={() => setSelectedNodeId(null)}
              onDelete={deleteSelectedNode}
            />
          )}
        </div>

        {/* Bottom Workflow Controls Panel */}
        <div className="bottom-panel">
          <div className="workflow-controls">
            <div className="workflow-actions">
              <button
                onClick={() => {
                  setNodes([]);
                  setEdges([]);
                  setSelectedWorkflow(null);
                }}
              >
                New
              </button>
              <button onClick={saveWorkflow}>Save Workflow</button>
              <button
                onClick={validateWorkflow}
                style={{ backgroundColor: "#ff9500" }}
              >
                Validate
              </button>

            </div>

            <div className="workflow-management">
              <h3>Saved Workflows</h3>
              {workflows.length > 0 ? (
                <div className="workflow-selector">
                  <select
                    value={selectedWorkflow?.id || ""}
                    onChange={(e) => {
                      const workflowId = e.target.value;
                      const workflow = workflows.find(
                        (wf) => wf.id === workflowId
                      );
                      if (workflow) loadWorkflow(workflow);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #e5e5e7",
                      backgroundColor: "#ffffff",
                      fontSize: "14px",
                      color: "#1d1d1f",
                      marginBottom: "12px",
                      cursor: "pointer",
                      minWidth: "200px",
                    }}
                  >
                    <option value="">Select a workflow...</option>
                    {workflows.map((wf) => (
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
                          padding: "6px 12px",
                          fontSize: "12px",
                          backgroundColor: "#007aff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          marginRight: "8px",
                        }}
                      >
                        📂 Load
                      </button>
                      <button
                        onClick={() => deleteWorkflow(selectedWorkflow.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          backgroundColor: "#ff3b30",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    textAlign: "center",
                    padding: "16px",
                    backgroundColor: "#f5f5f7",
                    borderRadius: "6px",
                  }}
                >
                  No workflows saved yet
                </div>
              )}
            </div>

            <div className="template-controls">
              <h3>Templates</h3>
              <div className="template-buttons">
                <button
                  onClick={() => loadTemplate("segmented-welcome-flow")}
                  style={{ fontSize: "11px", marginBottom: "4px" }}
                >
                  🌳 Segmented Welcome Flow (Tree Structure)
                </button>
              </div>
            </div>



            <div className="jsonlogic-controls">
              <h3>JsonLogic</h3>
              <button
                onClick={() => setShowJsonLogic(!showJsonLogic)}
                style={{ fontSize: "12px" }}
              >
                {showJsonLogic ? "🔽" : "▶️"} {showJsonLogic ? "Hide" : "Show"}{" "}
                Logic
              </button>
              {showJsonLogic && jsonLogicRule && (
                <div className="jsonlogic-actions">
                  <button onClick={testJsonLogic} style={{ fontSize: "11px" }}>
                    🧪 Test Logic
                  </button>
                  <button onClick={copyJsonLogic} style={{ fontSize: "11px" }}>
                    📋 Copy Logic
                  </button>
                </div>
              )}
            </div>
          </div>

          {showJsonLogic && jsonLogicRule && (
            <div className="jsonlogic-display">
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  backgroundColor: "#f5f5f7",
                  padding: "8px",
                  borderRadius: "4px",
                  maxHeight: "150px",
                  overflow: "auto",
                  fontFamily: "monospace",
                }}
              >
                <pre>
                  {WorkflowToJsonLogicConverter.prettyPrint(jsonLogicRule)}
                </pre>
              </div>
            </div>
          )}

          {showJsonLogic && !jsonLogicRule && (
            <div
              style={{ fontSize: "11px", color: "#999", textAlign: "center" }}
            >
              No workflow logic yet
            </div>
          )}

          <div
            style={{
              fontSize: "11px",
              color: "#666",
              backgroundColor: "#f0f8ff",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #007aff",
              marginTop: "12px",
            }}
          >
            ✅ Visual workflows are stored separately from JsonLogic rules. Both
            are maintained for editing and execution.
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#888",
              backgroundColor: "#f9f9f9",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px solid #e0e0e0",
              marginTop: "8px",
            }}
          >
            💡 <strong>Tip:</strong> Click a node to select it, then press{" "}
            <kbd>Delete</kbd> or <kbd>Backspace</kbd> to remove it. You can also
            use the "Delete Node" button in the properties panel.
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

// NodeEditor component is now replaced by PropertiesPanel.js

export default App;
