export interface Position {
  x: number;
  y: number;
}

export class MindmapNode {
  constructor(
    public id: string,
    public label: string,
    public position: Position,
    public category?: string,
    public details?: string // Summary text representing this node
  ) {}
}

export class MindmapEdge {
  constructor(
    public id: string,
    public sourceNodeId: string,
    public targetNodeId: string,
    public label?: string // Relationship description
  ) {}
}

export class Mindmap {
  constructor(
    public id: string,
    public documentId: string,
    public rootNodeId: string,
    public nodes: MindmapNode[],
    public edges: MindmapEdge[],
    public createdAt: Date = new Date()
  ) {}

  getNodeById(id: string): MindmapNode | undefined {
    return this.nodes.find(node => node.id === id);
  }

  // Phương thức hỗ trợ xuất format cho React Flow định tuyến dễ dàng.
  toReactFlowFormat() {
    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        position: n.position,
        data: { label: n.label, details: n.details }
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
