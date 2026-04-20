"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

// ===== TYPES =====
interface MindmapNodeData {
  id: string;
  text: string;
  children: MindmapNodeData[];
  color: string;
  width?: number;
  height?: number;
}

interface NodePos {
  x: number; y: number; w: number; h: number; depth: number;
}

interface StoredNodePos extends NodePos {
  text?: string;
}

interface InteractiveMindmapProps {
  chart: string;
  onCodeChange?: (code: string) => void;
  documentId?: string;
}

// ===== CONSTANTS =====
const NODE_COLORS = [
  { name: 'Indigo', value: '#6366f1' }, { name: 'Rose', value: '#f43f5e' },
  { name: 'Sky', value: '#0ea5e9' }, { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' }, { name: 'Violet', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' }, { name: 'Teal', value: '#14b8a6' },
  { name: 'Red', value: '#ef4444' }, { name: 'Blue', value: '#3b82f6' },
  { name: 'Lime', value: '#84cc16' }, { name: 'Orange', value: '#f97316' },
];
const DEPTH_COLORS = ['#4338ca', '#6366f1', '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
const V_GAP = 150;
const H_PADDING = 180;
const NODE_H = 60;
const NODE_MIN_W = 180;
const PAD = 200;

function wrapText(text: string, width: number, height: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55;
  const padding = 30;
  const availW = width - padding;
  const availH = height - 20;
  const lineHeight = fontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(availH / lineHeight));
  const maxCharsPerLine = Math.max(5, Math.floor(availW / charWidth));

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length <= maxCharsPerLine) {
      currentLine += (currentLine === "" ? "" : " ") + word;
    } else {
      if (lines.length + 1 >= maxLines) {
        // This would be the last allowed line, so we must truncate
        if (currentLine.length > maxCharsPerLine - 3) {
          currentLine = currentLine.substring(0, maxCharsPerLine - 3) + "...";
        } else {
          currentLine += "...";
        }
        lines.push(currentLine);
        return lines;
      }
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    if (lines.length >= maxLines) {
      lines[lines.length - 1] = lines[lines.length - 1].substring(0, maxCharsPerLine - 3) + "...";
    } else {
      lines.push(currentLine);
    }
  }
  return lines;
}

// ===== PARSER =====
function extractText(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^\(\((.+)\)\)$/, '$1').replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)\]$/, '$1').replace(/^\{\{(.+)\}\}$/, '$1');
  return t;
}
function getIndent(line: string): number { const m = line.match(/^(\s*)/); return m ? m[1].length : 0; }

function estW(text: string): number {
  const safeText = text || "";
  const textW = safeText.length * 16;
  return Math.max(NODE_MIN_W + 60, textW + 140);
}

function parseMermaid(code: string): MindmapNodeData | null {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === 'mindmap') { start = i + 1; break; }
  }
  if (start === -1 || start >= lines.length) return null;

  const stack: { node: MindmapNodeData; indent: number; depth: number; path: string }[] = [];
  let root: MindmapNodeData | null = null;
  let localNid = 0;
  const usedIds = new Set<string>();
  // Track how many times a name has appeared under a specific parent path to create stable index-based IDs
  const pathNameCounts = new Map<string, number>();

  const ensureUnique = (baseId: string): string => {
    const count = pathNameCounts.get(baseId) || 0;
    pathNameCounts.set(baseId, count + 1);
    return count === 0 ? baseId : `${baseId}-${count}`;
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const indent = getIndent(line);
    const raw = line.trim();
    if (!raw) continue;

    let id = `node-${++localNid}`;
    let text = raw;
    let color = '';
    let width: number | undefined = undefined;
    let height: number | undefined = undefined;

    // Extract metadata
    const colorMatch = raw.match(/:::color-([a-fA-F0-9]{3,6})/);
    if (colorMatch) color = `#${colorMatch[1]}`;
    const widthMatch = raw.match(/:::w-(\d+)/);
    if (widthMatch) width = parseInt(widthMatch[1]);
    const heightMatch = raw.match(/:::h-(\d+)/);
    if (heightMatch) height = parseInt(heightMatch[1]);

    // 1. Cleanup text from metadata tags FIRST
    let cleanText = raw.replace(/:::color-[a-fA-F0-9]{3,6}/g, '')
      .replace(/:::w-\d+/g, '')
      .replace(/:::h-\d+/g, '')
      .trim();

    // 2. Extract ID and Content with Hyper-Robust Recursive Cleanup
    // 2a. Strip ID prefix if polymorphic (id((text)) -> ((text)))
    let contentOnly = cleanText.replace(/^[a-zA-Z0-9_-]+\s*(?=[\(\[\{])/, '');
    
    // 2b. Identify ID if present for structural purposes
    const idExtractMatch = cleanText.match(/^([a-zA-Z0-9_-]+)\s*[\(\[\{]/);
    if (idExtractMatch) id = idExtractMatch[1];

    // 2c. Recursive Outer Shape Peeling
    let finalizedText = contentOnly.trim();
    let changed = true;
    while (changed) {
      changed = false;
      const start = finalizedText;
      if (finalizedText.startsWith('((') && finalizedText.endsWith('))')) {
        finalizedText = finalizedText.substring(2, finalizedText.length - 2).trim();
        changed = true;
      } else if (finalizedText.startsWith('{{') && finalizedText.endsWith('}}')) {
        finalizedText = finalizedText.substring(2, finalizedText.length - 2).trim();
        changed = true;
      } else if (finalizedText.startsWith('(') && finalizedText.endsWith(')')) {
        finalizedText = finalizedText.substring(1, finalizedText.length - 1).trim();
        changed = true;
      } else if (finalizedText.startsWith('[') && finalizedText.endsWith(']')) {
        finalizedText = finalizedText.substring(1, finalizedText.length - 1).trim();
        changed = true;
      }
      if (start === finalizedText) changed = false;
    }

    // 2d. Final Aggressive Boundary Purge (Safety for asymmetrical markers)
    text = finalizedText.replace(/^[\(\[\{]+/, '').replace(/[\)\]\}]+$/, '').trim();

    // Fallback ID if text is empty
    if (!text) {
      id = ensureUnique(`node-${++localNid}`);
    } else {
      // CONTENT-AWARE + PATH-AWARE SLUG
      const parentPath = stack.length > 0 ? stack[stack.length - 1].path : '';
        const textSlug = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 15);
        const baseId = `n-${parentPath ? parentPath + '-' : ''}${textSlug}`;
        id = ensureUnique(baseId);
      }
    id = ensureUnique(id);

    if (!text || text.toLowerCase().includes('undefined') || text === '') {
      text = stack.length === 0 ? 'Chủ đề chính' : 'Nhánh mới';
    }

    const newNode: MindmapNodeData = { id, text, children: [], color, width, height };

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      if (!root) root = newNode;
      if (!newNode.color) newNode.color = '#4338ca';
      stack.push({ node: newNode, indent, depth: 0, path: id.replace(/^n-/, '').slice(0, 15) });
    } else {
      const parentEntry = stack[stack.length - 1];
      parentEntry.node.children.push(newNode);
      const depth = parentEntry.depth + 1;
      const currentPath = parentEntry.path + '-' + id.replace(/^n-/, '').slice(0, 15);

      // Default color if not explicitly set
      if (!newNode.color) {
        if (depth === 1) {
          newNode.color = NODE_COLORS[(parentEntry.node.children.length - 1) % NODE_COLORS.length].value;
        } else {
          newNode.color = parentEntry.node.color;
        }
      }

      stack.push({ node: newNode, indent, depth, path: currentPath });
    }
  }
  return root;
}

function toMermaid(root: MindmapNodeData): string {
  let r = 'mindmap\n';
  function w(n: MindmapNodeData, d: number) {
    if (!n) return;
    const safeText = (!n.text || n.text === 'undefined') ? (d === 1 ? 'Chủ đề chính' : 'Nhánh mới') : n.text;
    const shape = d === 1 ? `((${safeText}))` : `(${safeText})`;
    let meta = '';
    const cleanId = n.id;
    if (n.color) meta += `:::color-${n.color.replace('#', '')}`;
    if (n.width) meta += `:::w-${n.width}`;
    if (n.height) meta += `:::h-${n.height}`;
    r += '  '.repeat(d) + `${cleanId}${shape}${meta}\n`;
    if (n.children && Array.isArray(n.children)) {
      n.children.forEach(c => w(c, d + 1));
    }
  }
  w(root, 1); return r;
}

// ===== TREE OPS =====
function updateNode(root: MindmapNodeData, id: string, upd: Partial<MindmapNodeData>): MindmapNodeData {
  if (root.id === id) return { ...root, ...upd };
  const children = Array.isArray(root.children) ? root.children : [];
  return { ...root, children: children.map(c => updateNode(c, id, upd)) };
}

function addChild(root: MindmapNodeData, pid: string, depth: number): MindmapNodeData {
  const children = Array.isArray(root.children) ? root.children : [];
  if (root.id === pid) {
    const id = `u-${Math.random().toString(36).substr(2, 9)}`;
    const text = 'Nhánh mới';

    return {
      ...root,
      children: [
        ...children,
        { id, text, children: [], color: root.color || DEPTH_COLORS[(depth + 1) % DEPTH_COLORS.length] }
      ]
    };
  }
  return { ...root, children: children.map(c => addChild(c, pid, depth + 1)) };
}
function removeNode(root: MindmapNodeData, id: string): MindmapNodeData {
  return { ...root, children: root.children.filter(c => c.id !== id).map(c => removeNode(c, id)) };
}
function findDepth(root: MindmapNodeData, id: string, d = 0): number {
  if (root.id === id) return d;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const c of children) { const r = findDepth(c, id, d + 1); if (r >= 0) return r; }
  return -1;
}
function flattenTree(node: MindmapNodeData, depth = 0): { id: string; text: string; depth: number; color: string; width?: number; height?: number }[] {
  const r: { id: string; text: string; depth: number; color: string; width?: number; height?: number }[] = [{ id: node.id, text: node.text, depth, color: node.color, width: node.width, height: node.height }];
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach(c => r.push(...flattenTree(c, depth + 1))); return r;
}
function findNode(root: MindmapNodeData, id: string): MindmapNodeData | null {
  if (root.id === id) return root;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const c of children) { const r = findNode(c, id); if (r) return r; }
  return null;
}
function getDescendantIds(node: MindmapNodeData): string[] {
  const ids = [node.id];
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach(c => ids.push(...getDescendantIds(c)));
  return ids;
}

// ===== LAYOUT =====
function stH(node: MindmapNodeData): number {
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return node.height || NODE_H;
  const childSum = children.reduce((acc, c) => acc + stH(c), 0);
  const gapSum = (children.length - 1) * V_GAP;
  return Math.max(node.height || NODE_H, childSum + gapSum);
}

function computePositions(root: MindmapNodeData): Record<string, NodePos> {
  const pos: Record<string, NodePos> = {};
  if (!root) return pos;
  const rw = root.width || Math.max(estW(root.text || ""), 140);
  const rh = root.height || Math.max(NODE_H, 80);
  pos[root.id] = { x: 0, y: 0, w: rw, h: rh, depth: 0 };

  const left = root.children.slice(0, Math.ceil(root.children.length / 2));
  const right = root.children.slice(Math.ceil(root.children.length / 2));

  function layoutSide(parent: MindmapNodeData, children: MindmapNodeData[], dir: 1 | -1, depth: number) {
    const pp = pos[parent.id];
    const px = pp.x, py = pp.y;

    // Calculate total height needed for children
    const totalH = children.reduce((s, c) => s + stH(c) + V_GAP, 0) - V_GAP;
    let cy = py - totalH / 2;

    // To prevent overlaps, find the max width among siblings to align them
    const widths = children.map(c => c.width || estW(c.text));
    const maxCW = Math.max(...widths, NODE_MIN_W);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const sh = stH(child);
      const cw = widths[i];
      const ch = child.height || NODE_H;

      // Align children so their "inner" edges are at the same distance from parent
      // For dir=-1 (left): cx = px - (pp.w/2 + H_PADDING + maxCW/2)
      // But we then shift by (maxCW - cw)/2 to keep the inner edge aligned
      const baseDist = pp.w / 2 + H_PADDING + maxCW / 2;
      const cx = px + dir * (baseDist - (maxCW - cw) / 2);

      const centerY = cy + sh / 2;
      pos[child.id] = { x: cx, y: centerY, w: cw, h: ch, depth };

      if (child.children.length) {
        layoutSide(child, child.children, dir, depth + 1);
      }
      cy += sh + V_GAP;
    }
  }

  if (left.length) layoutSide(root, left, -1, 1);
  if (right.length) layoutSide(root, right, 1, 1);
  return pos;
}

// ===== SVG CONNECTION PATH =====
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const cp = Math.max(20, Math.abs(dx) * 0.45);
  return `M ${x1} ${y1} C ${x1 + (dx > 0 ? cp : -cp)} ${y1}, ${x2 - (dx > 0 ? cp : -cp)} ${y2}, ${x2} ${y2}`;
}

// ===== COMPONENT =====
const InteractiveMindmap = forwardRef(({ chart, onCodeChange, documentId }: InteractiveMindmapProps, ref) => {
  const [tree, setTree] = useState<MindmapNodeData | null>(null);
  const [positions, setPositions] = useState<Record<string, NodePos>>({});
  const lastExportedRef = useRef('');
  const lastStructureRef = useRef<string>('');
  const storageKey = `mindmap-pos-${documentId || 'default'}`;

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [menuMode, setMenuMode] = useState<'main' | 'color' | 'edit' | null>(null);
  const [editText, setEditText] = useState('');

  // EXPORT ENGINE
  useImperativeHandle(ref, () => ({
    downloadImage: () => {
      if (!svgRef.current || Object.keys(positions).length === 0) return;

      const svg = svgRef.current;
      const posValues = Object.values(positions);
      const minX = Math.min(...posValues.map(p => p.x - p.w / 2)) - 100;
      const maxX = Math.max(...posValues.map(p => p.x + p.w / 2)) + 100;
      const minY = Math.min(...posValues.map(p => p.y - p.h / 2)) - 100;
      const maxY = Math.max(...posValues.map(p => p.y + p.h / 2)) + 100;

      const exportW = maxX - minX;
      const exportH = maxY - minY;

      const clone = svg.cloneNode(true) as SVGSVGElement;

      // Clean up UI elements from clone
      clone.querySelectorAll('.resize-handles').forEach(el => el.remove());
      clone.querySelectorAll('.animate-pulse').forEach(el => el.remove());

      // Setup export dimensions
      clone.setAttribute('width', exportW.toString());
      clone.setAttribute('height', exportH.toString());
      clone.setAttribute('viewBox', `${minX} ${minY} ${exportW} ${exportH}`);

      // Background and Styles
      const bg = document.body.classList.contains('dark') ? '#0f172a' : '#f8fafc';
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        svg { background: ${bg}; font-family: 'Outfit', sans-serif; }
        .mindmap-bg { fill: ${bg}; }
      `;
      clone.prepend(style);

      const svgData = new XMLSerializer().serializeToString(clone);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      canvas.width = exportW * 2; // High DPI
      canvas.height = exportH * 2;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `mindmap-${documentId || 'export'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    resetLayout: () => {
      localStorage.removeItem(storageKey);
      setPositions({});
    }
  }));

  // Refs for listeners
  const svgRef = useRef<SVGSVGElement>(null);
  const treeRef = useRef<MindmapNodeData | null>(null);
  const posRef = useRef<Record<string, NodePos>>({});
  const dragRef = useRef<{
    nodeId: string;
    descendantIds: string[];
    startX: number; startY: number;
    snapPositions: Record<string, NodePos>;
    startCTM: DOMMatrix | null;
  } | null>(null);

  const resizeRef = useRef<{
    nodeId: string;
    direction: 'tl' | 'tr' | 'bl' | 'br';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startCTM: DOMMatrix | null;
  } | null>(null);

  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { posRef.current = positions; }, [positions]);

  const isManualChangeRef = useRef(false);

  // AUTO-PERSIST LAYOUT: Save every change instantly
  useEffect(() => {
    if (isManualChangeRef.current && Object.keys(positions).length > 0 && lastStructureRef.current) {
      // Create a metadata-rich layout for Fuzzy Recovery
      const layoutWithMeta: Record<string, any> = {};
      const flat = tree ? flattenTree(tree) : [];

      Object.keys(positions).forEach(id => {
        const node = flat.find(n => n.id === id);
        layoutWithMeta[id] = {
          ...positions[id],
          text: node?.text || '' // Save text for reverse matching
        };
      });

      localStorage.setItem(storageKey, JSON.stringify({
        layout: layoutWithMeta,
        hash: lastStructureRef.current
      }));
      isManualChangeRef.current = false; // Reset ONLY after save
    }
  }, [positions, storageKey, tree]);

  // Parse chart -> tree
  useEffect(() => {
    if (chart && chart !== lastExportedRef.current) {
      const parsed = parseMermaid(chart);
      if (parsed) setTree(parsed);
    }
  }, [chart]);

  // Update layout when tree structure changes
  useEffect(() => {
    if (!tree) return;

    const currentStructure = flattenTree(tree).map(n => n.id).join('|');
    lastStructureRef.current = currentStructure;

    const defaultLayout = computePositions(tree);
    const savedData = localStorage.getItem(storageKey);

    setPositions(prev => {
      // Build a comprehensive source: Combine live manual edits and historical storage
      let source: Record<string, StoredNodePos> = { ...prev };
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          source = { ...(parsed.layout || {}), ...source };
        } catch (e) { }
      }

      // 0. Calculate Global Shift (Delta) based on Root position
      // This ensures new nodes appear near the rest of the diagram, not at (0,0)
      let dx = 0, dy = 0;
      if (tree && source[tree.id]) {
        dx = source[tree.id].x - defaultLayout[tree.id].x;
        dy = source[tree.id].y - defaultLayout[tree.id].y;
      }

      const merged: Record<string, NodePos> = {};
      const flatNodes = flattenTree(tree);
      const usedHistorical = new Set<string>();

      flatNodes.forEach(node => {
        const isUserNode = node.id.startsWith('u-');

        // 1. Direct ID Match (Fastest & Most Reliable)
        if (source[node.id]) {
          merged[node.id] = { ...defaultLayout[node.id], ...source[node.id] };
        }
        // 2. Semantic Content Match (ONLY for AI-generated nodes)
        // User nodes (u-*) should NEVER fuzzy-match to avoid stacking new branches
        else if (!isUserNode) {
          const histKey = Object.keys(source).find(k =>
            !usedHistorical.has(k) && source[k].text === node.text && !k.startsWith('u-')
          );

          if (histKey) {
            usedHistorical.add(histKey);
            const { text: _t, ...pos } = source[histKey];
            merged[node.id] = { ...defaultLayout[node.id], ...pos };
          } else {
            // 3a. Brand New AI Node
            merged[node.id] = {
              ...defaultLayout[node.id],
              x: defaultLayout[node.id].x + dx,
              y: defaultLayout[node.id].y + dy
            };
          }
        } else {
          // 3b. Brand New USER Node: Always use structural default + Delta shift
          merged[node.id] = {
            ...defaultLayout[node.id],
            x: defaultLayout[node.id].x + dx,
            y: defaultLayout[node.id].y + dy
          };
        }
      });

      posRef.current = merged;
      return merged;
    });
  }, [tree, storageKey]);

  // Shared update wrapper that handles both full tree replacement and partial node updates
  const applyUpdate = useCallback((target: MindmapNodeData | string, updates?: Partial<MindmapNodeData>) => {
    if (!tree) return;

    let newTree: MindmapNodeData;
    if (typeof target === 'string') {
      // Find the specific node and clone the tree
      newTree = JSON.parse(JSON.stringify(tree)); // Deep clone to be safe
      const node = findNode(newTree, target);
      if (node && updates) {
        Object.assign(node, updates);
      }
    } else {
      newTree = target;
    }

    setTree(newTree);
    const code = toMermaid(newTree);
    lastExportedRef.current = code;
    if (onCodeChange) onCodeChange(code);

    // Explicitly persist everything on update
    localStorage.setItem(storageKey, JSON.stringify({
      layout: posRef.current,
      hash: flattenTree(newTree).map(n => n.id).join('|')
    }));
  }, [tree, onCodeChange, storageKey]);

  // === DRAG HANDLERS ===
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;

    // Stop propagation to prevent page-level canvas drag or UI toggle
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    e.preventDefault();

    if (!treeRef.current || resizeRef.current) return;
    const node = findNode(treeRef.current, nodeId);
    if (!node) return;

    // Snapshot CTM at start of drag to keep coordinates stable
    const ctm = svgRef.current?.getScreenCTM()?.inverse() || null;
    const svgPt = toSvgCoords(e.clientX, e.clientY);

    dragRef.current = {
      nodeId,
      descendantIds: getDescendantIds(node),
      startX: svgPt.x,
      startY: svgPt.y,
      snapPositions: { ...posRef.current },
      startCTM: ctm
    };

    // Add global no-select during drag
    document.body.classList.add('select-none');
  }, [toSvgCoords]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, dir: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation();
    e.preventDefault();
    if (!treeRef.current) return;
    const node = findNode(treeRef.current, nodeId);
    const p = posRef.current[nodeId];
    if (!node || !p) return;

    const ctm = svgRef.current?.getScreenCTM()?.inverse() || null;
    const svgPt = toSvgCoords(e.clientX, e.clientY);

    resizeRef.current = {
      nodeId,
      direction: dir,
      startX: svgPt.x,
      startY: svgPt.y,
      startW: p.w,
      startH: p.h,
      startCTM: ctm
    };
    dragRef.current = null;
    document.body.classList.add('select-none');
  }, [toSvgCoords]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const rs = resizeRef.current;
      if (rs && rs.startCTM) {
        const ctm = rs.startCTM;
        const curX = e.clientX * ctm.a + e.clientY * ctm.c + ctm.e;
        const curY = e.clientX * ctm.b + e.clientY * ctm.d + ctm.f;
        const dx = curX - rs.startX;
        const dy = curY - rs.startY;

        let nw = rs.startW;
        let nh = rs.startH;
        if (rs.direction.includes('r')) nw = Math.max(100, rs.startW + dx * 2);
        if (rs.direction.includes('l')) nw = Math.max(100, rs.startW - dx * 2);
        if (rs.direction.includes('b')) nh = Math.max(60, rs.startH + dy * 2);
        if (rs.direction.includes('t')) nh = Math.max(60, rs.startH - dy * 2);

        // Performance FIX: Update ONLY the local positions state during mouse move
        // This avoids heavy JSON stringify/parse on every frame
        setPositions(prev => {
          const updated = { ...prev, [rs.nodeId]: { ...prev[rs.nodeId], w: nw, h: nh } };
          posRef.current = updated;
          isManualChangeRef.current = true;
          return updated;
        });

        // Keep menu pinned to top of node during resize
        if (selectedNodeId === rs.nodeId && svgRef.current) {
          const vb = svgRef.current.viewBox.baseVal;
          const p = posRef.current[rs.nodeId];
          setMenuPos({
            x: p.x - vb.x,
            y: p.y - nh / 2 - vb.y - 12
          });
        }
        return;
      }

      const ds = dragRef.current;
      if (!ds || !ds.startCTM) return;

      // Use snapshot CTM to ensure stable movement even if viewBox changes
      const ctm = ds.startCTM;
      const curX = e.clientX * ctm.a + e.clientY * ctm.c + ctm.e;
      const curY = e.clientX * ctm.b + e.clientY * ctm.d + ctm.f;

      const dx = curX - ds.startX;
      const dy = curY - ds.startY;

      const nextPos = { ...ds.snapPositions };
      for (const id of ds.descendantIds) {
        if (nextPos[id]) {
          nextPos[id] = { ...nextPos[id], x: nextPos[id].x + dx, y: nextPos[id].y + dy };
        }
      }
      setPositions(nextPos);
      posRef.current = nextPos;
      isManualChangeRef.current = true; // MARK AS MANUAL
    };
    const onMouseUp = (e: MouseEvent) => {
      // MANDATORY: Explicitly mark as manual one last time to catch the final mouse position
      isManualChangeRef.current = true;

      if (resizeRef.current) {
        const rs = resizeRef.current;
        const finalPos = posRef.current[rs.nodeId];

        // COMMIT: Now update the actual tree data and DB
        if (finalPos) {
          applyUpdate(rs.nodeId, { width: finalPos.w, height: finalPos.h });
        }

        resizeRef.current = null;
        dragRef.current = null;
        document.body.classList.remove('select-none');
        return;
      }
      const ds = dragRef.current;
      if (!ds) {
        document.body.classList.remove('select-none');
        return;
      }

      const svgPt = toSvgCoords(e.clientX, e.clientY);
      const dx = Math.abs(svgPt.x - ds.startX);
      const dy = Math.abs(svgPt.y - ds.startY);

      if (dx < 6 && dy < 6) {
        // Precise Click → update UI state
        const p = posRef.current[ds.nodeId];
        if (p && svgRef.current) {
          const vb = svgRef.current.viewBox.baseVal;
          setSelectedNodeId(ds.nodeId);
          setMenuPos({
            x: p.x - vb.x,
            y: p.y - p.h / 2 - vb.y - 12
          });
          setMenuMode('main');
        }
      }

      dragRef.current = null;
      document.body.classList.remove('select-none');
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, [toSvgCoords]);

  // Close menu
  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = () => { setSelectedNodeId(null); setMenuMode(null); };
    const t = setTimeout(() => window.addEventListener('click', handler), 100);
    return () => { clearTimeout(t); window.removeEventListener('click', handler); };
  }, [selectedNodeId]);

  // === ACTIONS ===
  const doAddChild = () => { if (tree && selectedNodeId) applyUpdate(addChild(tree, selectedNodeId, findDepth(tree, selectedNodeId))); };
  const doDelete = () => { if (tree && selectedNodeId && selectedNodeId !== tree.id) applyUpdate(removeNode(tree, selectedNodeId)); };
  const doStartEdit = () => {
    const flat = tree ? flattenTree(tree) : [];
    const n = flat.find(n => n.id === selectedNodeId);
    if (n) { setEditText(n.text); setMenuMode('edit'); }
  };
  const doCommitEdit = () => { if (tree && selectedNodeId && editText.trim()) applyUpdate(updateNode(tree, selectedNodeId, { text: editText.trim() })); };
  const doColorChange = (c: string) => { if (tree && selectedNodeId) applyUpdate(updateNode(tree, selectedNodeId, { color: c })); };

  // === COMPUTE VIEW ===
  const viewBox = useMemo(() => {
    const ids = Object.keys(positions);
    if (!ids.length) return { minX: -500, minY: -400, w: 1000, h: 800 };

    // Fixed: Stabilize viewBox calculation to allow root/overall movement to be perceptible
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const id of ids) {
      const p = positions[id];
      minX = Math.min(minX, p.x - p.w / 2);
      maxX = Math.max(maxX, p.x + p.w / 2);
      minY = Math.min(minY, p.y - p.h / 2);
      maxY = Math.max(maxY, p.y + p.h / 2);
    }

    const w = maxX - minX + PAD * 2;
    const h = maxY - minY + PAD * 2;

    // We keep minX/minY slightly more stable relative to the initial layout
    return {
      minX: minX - PAD,
      minY: minY - PAD,
      w: Math.max(w, 1200),
      h: Math.max(h, 900)
    };
  }, [positions]);

  // Connections from tree + positions
  const connections = useMemo(() => {
    if (!tree) return [];
    const conns: { parentId: string; childId: string; depth: number }[] = [];
    function walk(node: MindmapNodeData, depth: number) {
      if (!node.children || !Array.isArray(node.children)) return;
      for (const c of node.children) {
        conns.push({ parentId: node.id, childId: c.id, depth });
        walk(c, depth + 1);
      }
    }
    walk(tree, 1);
    return conns;
  }, [tree]);

  if (!tree || !Object.keys(positions).length) {
    return <div className="flex items-center justify-center p-20"><div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>;
  }

  const allNodes = flattenTree(tree);

  return (
    <div className="relative mindmap-container" style={{ width: viewBox.w, height: viewBox.h }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.w} ${viewBox.h}`}
        width={viewBox.w}
        height={viewBox.h}
        className="select-none"
        style={{ overflow: 'visible' }}
      >
        {/* Gradient defs */}
        <defs>
          {connections.map(c => {
            const pn = findNode(tree!, c.parentId);
            const cn = findNode(tree!, c.childId);
            if (!pn || !cn) return null;
            // Fixed: Use userSpaceOnUse to prevent gradients from disappearing on horizontal/vertical lines
            const gid = `g-${c.parentId}-${c.childId}`.replace(/[^a-zA-Z0-9-]/g, '_');
            const pp = positions[c.parentId];
            const cp = positions[c.childId];
            if (!pp || !cp) return null;

            return (
              <linearGradient
                key={gid}
                id={gid}
                gradientUnits="userSpaceOnUse"
                x1={pp.x} y1={pp.y}
                x2={cp.x} y2={cp.y}
              >
                <stop offset="0%" stopColor={pn.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={cn.color} stopOpacity={0.8} />
              </linearGradient>
            );
          })}
          <filter id="node-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.08" />
          </filter>
          <filter id="node-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Connection paths */}
        {connections.map(c => {
          const pp = positions[c.parentId];
          const cp = positions[c.childId];
          if (!pp || !cp) return null;

          const cn = findNode(tree!, c.childId);
          const gid = `g-${c.parentId}-${c.childId}`.replace(/[^a-zA-Z0-9-]/g, '_');
          const strokeW = Math.max(2, 5 - c.depth * 0.7);
          const strokeColor = cn?.color || '#cbd5e1';

          return (
            <path
              key={`e-${c.parentId}-${c.childId}`}
              d={bezierPath(pp.x, pp.y, cp.x, cp.y)}
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth={strokeW}
              strokeLinecap="round"
              style={{ stroke: `url(#${gid})`, fill: 'none' } as any}
            />
          );
        })}

        {/* Nodes */}
        {allNodes.map(n => {
          const p = positions[n.id];
          if (!p) return null;
          const isRoot = p.depth === 0;
          const isSelected = n.id === selectedNodeId;
          const fSize = isRoot ? 28 : 24;

          return (
            <g
              key={n.id}
              data-node-id={n.id}
              data-mindmap-node="true"
              onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
            >
              {/* Selection indicator */}
              {isSelected && (
                <rect
                  x={p.x - p.w / 2 - 5} y={p.y - p.h / 2 - 5}
                  width={p.w + 10} height={p.h + 10}
                  rx={isRoot ? 50 : 18} ry={isRoot ? 50 : 18}
                  fill="none" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="6 3"
                  className="animate-pulse"
                />
              )}

              {/* Shape: Use Capsule (Rounded Rect) for all levels to ensure text fits */}
              <rect
                x={p.x - p.w / 2}
                y={p.y - p.h / 2}
                width={p.w}
                height={p.h}
                rx={p.h / 2}
                ry={p.h / 2}
                fill={n.color}
                filter={isSelected ? 'url(#node-glow)' : 'url(#node-shadow)'}
              />
              {/* Text: Multi-line Support */}
              <text
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fill="white"
                fontSize={fSize}
                fontWeight={900}
                fontFamily="'Outfit','Inter',sans-serif"
                className="pointer-events-none select-none"
              >
                {(() => {
                  const lines = wrapText(n.text || '', p.w, p.h, fSize);
                  const lineHeight = fSize * 1.2;
                  const totalH = lines.length * lineHeight;
                  const firstLineY = -(totalH / 2) + (lineHeight / 2);
                  return lines.map((line, i) => (
                    <tspan key={i} x={p.x} dy={i === 0 ? firstLineY : lineHeight}>{line}</tspan>
                  ));
                })()}
              </text>

              {/* L-shaped corner brackets with floating padding */}
              {isSelected && (() => {
                const off = 10; // Floating Padding (khoảng cách khung)
                const len = 15; // Chiều dài cạnh khung
                return (
                  <g className="resize-handles" stroke="#6366f1" strokeWidth={2.5} fill="none" strokeLinecap="round">
                    {/* Top Left */}
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y - p.h / 2 - off + len} V ${p.y - p.h / 2 - off} H ${p.x - p.w / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nwse-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'tl' as any)} />
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y - p.h / 2 - off + len} V ${p.y - p.h / 2 - off} H ${p.x - p.w / 2 - off + len}`} pointerEvents="none" className="transition-colors" />

                    {/* Top Right */}
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y - p.h / 2 - off} H ${p.x + p.w / 2 + off} V ${p.y - p.h / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nesw-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'tr' as any)} />
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y - p.h / 2 - off} H ${p.x + p.w / 2 + off} V ${p.y - p.h / 2 - off + len}`} pointerEvents="none" className="transition-colors" />

                    {/* Bottom Left */}
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y + p.h / 2 + off - len} V ${p.y + p.h / 2 + off} H ${p.x - p.w / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nesw-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'bl' as any)} />
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y + p.h / 2 + off - len} V ${p.y + p.h / 2 + off} H ${p.x - p.w / 2 - off + len}`} pointerEvents="none" className="transition-colors" />

                    {/* Bottom Right */}
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y + p.h / 2 + off} H ${p.x + p.w / 2 + off} V ${p.y + p.h / 2 + off - len}`} stroke="transparent" strokeWidth={24} cursor="nwse-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'br' as any)} />
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y + p.h / 2 + off} H ${p.x + p.w / 2 + off} V ${p.y + p.h / 2 + off - len}`} pointerEvents="none" className="transition-colors" />
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      {/* === CONTEXT MENU === */}
      {selectedNodeId && menuMode && (() => {
        const flat = tree ? flattenTree(tree) : [];
        const node = flat.find(n => n.id === selectedNodeId);
        if (!node) return null;
        const isRoot = node.depth === 0;

        if (menuMode === 'edit') {
          return (
            <div className="absolute z-[999]" style={{ left: menuPos.x, top: menuPos.y, transform: 'translate(-50%, -100%)' }} onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 mb-2 w-[320px]">
                <p className="text-[12px] font-bold text-slate-400 dark:text-white/40 mb-3 px-1">Chỉnh sửa nội dung</p>
                <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') doCommitEdit(); if (e.key === 'Escape') { setMenuMode(null); setSelectedNodeId(null); } e.stopPropagation(); }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-base text-slate-900 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-indigo-500/50" />
                <div className="flex gap-3 mt-4">
                  <button onClick={doCommitEdit} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-400 active:scale-95 shadow-lg shadow-indigo-500/20">Lưu thay đổi</button>
                  <button onClick={() => setMenuMode('main')} className="px-5 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60 rounded-xl text-xs font-bold">Hủy</button>
                </div>
              </div>
            </div>
          );
        }

        if (menuMode === 'color') {
          return (
            <div className="absolute z-[999]" style={{ left: menuPos.x, top: menuPos.y, transform: 'translate(-50%, -100%)' }} onClick={e => e.stopPropagation()}>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 mb-2">
                <p className="text-[12px] font-bold text-slate-400 dark:text-white/40 mb-3 px-1">Chọn màu nhánh</p>
                <div className="grid grid-cols-6 gap-3">
                  {NODE_COLORS.map(c => (
                    <button key={c.value} onClick={e => { e.stopPropagation(); doColorChange(c.value); }}
                      className="w-9 h-9 rounded-xl transition-all hover:scale-125 active:scale-95 shadow-sm"
                      style={{ backgroundColor: c.value, boxShadow: c.value === node.color ? `0 0 0 2px white, 0 0 0 5px ${c.value}` : 'none' }} title={c.name} />
                  ))}
                </div>
                <button onClick={e => { e.stopPropagation(); setMenuMode('main'); }} className="w-full mt-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-white/40 transition-colors">← Quay lại</button>
              </div>
            </div>
          );
        }

        return (
          <div className="absolute z-[999]" style={{ left: menuPos.x, top: menuPos.y, transform: 'translate(-50%, -100%)' }} onClick={e => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] p-3 mb-8 flex items-center gap-4">
              <button onClick={e => { e.stopPropagation(); doStartEdit(); }} className="p-4 rounded-[24px] text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90" title="Sửa nội dung">
                <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>edit</span>
              </button>
              <button onClick={e => { e.stopPropagation(); doAddChild(); }} className="p-4 rounded-[24px] text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90" title="Thêm nhánh con">
                <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>add_circle</span>
              </button>
              <button onClick={e => { e.stopPropagation(); setMenuMode('color'); }} className="p-4 rounded-[24px] text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-90" title="Đổi màu">
                <span className="material-symbols-outlined" style={{ color: node.color, fontSize: '64px' }}>palette</span>
              </button>
              {!isRoot && (
                <button onClick={e => { e.stopPropagation(); doDelete(); }} className="p-4 rounded-[24px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-90" title="Xóa nhánh">
                  <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>delete</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default InteractiveMindmap;
