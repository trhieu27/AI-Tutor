export class MindmapNode {
  constructor(id, label, position, category, details // Summary text representing this node
  ) {
    this.id = id;
    this.label = label;
    this.position = position;
    this.category = category;
    this.details = details;
  }
}
export class MindmapEdge {
  constructor(id, sourceNodeId, targetNodeId, label // Relationship description
  ) {
    this.id = id;
    this.sourceNodeId = sourceNodeId;
    this.targetNodeId = targetNodeId;
    this.label = label;
  }
}
export class Mindmap {
  constructor(id, documentId, rootNodeId, nodes = [], edges = [], createdAt = new Date()) {
    this.id = id;
    this.documentId = documentId;
    this.rootNodeId = rootNodeId;
    this.nodes = nodes;
    this.edges = edges;
    this.createdAt = createdAt;
  }
  getNodeById(id) {
    return this.nodes.find(node => node.id === id);
  }

  // Phương thức hỗ trợ xuất format cho React Flow định tuyến dễ dàng.
  toReactFlowFormat() {
    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        position: n.position,
        data: {
          label: n.label,
          details: n.details
        }
      })),
      edges: this.edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label
      }))
    };
  }
}