
export class MindmapNode {
  constructor(
    public id,
    public label,
    public position,
    public category,
    public details // Summary text representing this node
  ) {}
}

export class MindmapEdge {
  constructor(
    public id,
    public sourceNodeId,
    public targetNodeId,
    public label // Relationship description
  ) {}
}

export class Mindmap {
  constructor(
    public id,
    public documentId,
    public rootNodeId,
    public nodes = [],
    public edges = [],
    public createdAt = new Date()
  ) {}

  getNodeById(id) {
    return this.nodes.find(node => node.id === id);
  }

  // Phương thức hỗ trợ xuất format cho React Flow định tuyến dễ dàng.
  toReactFlowFormat() {
    return {
      nodes: this.nodes.map(n =>({
        id: n.id,
        position: n.position,
        data: { label: n.label, details: n.details }
      })),
      edges: this.edges.map(e =>({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        label: e.label
      }))
    };
  }
}
