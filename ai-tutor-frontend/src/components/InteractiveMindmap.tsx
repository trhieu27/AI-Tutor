
import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';

// ===== TYPES =====

// ===== CONSTANTS =====
// ── High-contrast SaaS colour palette ──
const NODE_COLORS = [
  { name: 'Indigo',  value: 'hsl(239 68% 58%)' },
  { name: 'Rose',    value: 'hsl(343 85% 58%)' },
  { name: 'Sky',     value: 'hsl(199 89% 48%)' },
  { name: 'Emerald', value: 'hsl(158 64% 44%)' },
  { name: 'Amber',   value: 'hsl(38 92% 50%)'  },
  { name: 'Violet',  value: 'hsl(263 70% 62%)' },
  { name: 'Pink',    value: 'hsl(328 81% 58%)' },
  { name: 'Teal',    value: 'hsl(173 58% 42%)' },
  { name: 'Red',     value: 'hsl(4 86% 58%)'   },
  { name: 'Blue',    value: 'hsl(217 91% 60%)' },
  { name: 'Lime',    value: 'hsl(84 81% 44%)'  },
  { name: 'Orange',  value: 'hsl(27 96% 54%)'  },
];
const DEPTH_COLORS = [
  'hsl(239 62% 50%)', 'hsl(239 68% 58%)', 'hsl(343 85% 58%)',
  'hsl(199 89% 48%)', 'hsl(158 64% 44%)', 'hsl(38 92% 50%)',
  'hsl(263 70% 62%)', 'hsl(328 81% 58%)'
];
const V_GAP = 180;
const H_PADDING = 220;
const NODE_H = 60;
const NODE_MIN_W = 180;
const PAD = 200;

function wrapText(text, width, height, fontSize) {
  const charWidth = fontSize * 0.55;
  const padding = 30;
  const availW = width - padding;
  const availH = height - 20;
  const lineHeight = fontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(availH / lineHeight));
  const maxCharsPerLine = Math.max(5, Math.floor(availW / charWidth));

  const words = text.split(' ');
  const lines = [];
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
function extractText(raw) {
  let t = raw.trim();
  t = t.replace(/^\(\((.+)\)\)$/, '$1').replace(/^\((.+)\)$/, '$1').replace(/^\[(.+)\]$/, '$1').replace(/^\{\{(.+)\}\}$/, '$1');
  return t;
}
function getIndent(line) { const m = line.match(/^(\s*)/); return m ? m[1].length : 0; }

function estW(text) {
  const safeText = text || "";
  const textW = safeText.length * 16;
  return Math.max(NODE_MIN_W + 60, textW + 140);
}

function parseMermaid(code) {
  const lines = code.split('\n').filter(l => l.trim().length > 0);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === 'mindmap') { start = i + 1; break; }
  }
  if (start === -1 || start >= lines.length) return null;

  const stack = [];
  let root = null;
  let localNid = 0;
  const usedIds = new Set();
  // Track how many times a name has appeared under a specific parent path to create stable index-based IDs
  const pathNameCounts = new Map();

  const ensureUnique = (baseId) => {
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
    let width = undefined;
    let height = undefined;

    // Extract metadata — supports both hex (#abc) and hsl(h s% l%) color formats
    const colorMatch = raw.match(/:::color-(hsl\([^)]+\)|#?[a-fA-F0-9]{3,6})/);
    if (colorMatch) {
      const raw_color = colorMatch[1];
      // Normalise: add # prefix only for bare hex strings
      color = raw_color.startsWith('hsl') ? raw_color : `#${raw_color.replace('#', '')}`;
    }
    const widthMatch = raw.match(/:::w-(\d+)/);
    if (widthMatch) width = parseInt(widthMatch[1]);
    const heightMatch = raw.match(/:::h-(\d+)/);
    if (heightMatch) height = parseInt(heightMatch[1]);

    // 1. Cleanup text from metadata tags FIRST (strips hsl AND hex color variants)
    let cleanText = raw.replace(/:::color-(?:hsl\([^)]+\)|#?[a-fA-F0-9]{3,6})/g, '')
      .replace(/:::w-\d+/g, '')
      .replace(/:::h-\d+/g, '')
      .trim();

    // 2. Extract ID and Content with Hyper-Robust Recursive Cleanup
    // 2a. Strip ID prefix if polymorphic (id((text)) -((text)))
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

    // ID Assignment explicit IDs from mermaid code, only generate for missing ones
    const hasExplicitId = idExtractMatch && idExtractMatch[1];
    if (hasExplicitId) {
      // The mermaid code had an explicit ID (e.g., u-abc123 or n-some-slug)
      // Preserve it exactly — this is critical for localStorage position matching
      id = idExtractMatch[1];
      if (usedIds.has(id)) {
        // Only add suffix if there's a genuine collision
        let counter = 1;
        while (usedIds.has(`${id}-${counter}`)) counter++;
        id = `${id}-${counter}`;
      }
      usedIds.add(id);
    } else if (!text) {
      id = ensureUnique(`node-${++localNid}`);
    } else {
      // No explicit ID in source — generate a stable content-based slug
      const parentPath = stack.length > 0 ? stack[stack.length - 1].path : '';
      const textSlug = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 15);
      const baseId = `n-${parentPath ? parentPath + '-' : ''}${textSlug}`;
      id = ensureUnique(baseId);
    }

    if (!text || text.toLowerCase().includes('undefined') || text === '') {
      text = stack.length === 0 ? 'Chủ đề chính' : 'Nhánh mới';
    }

    const newNode = { id, text, children: [], color, width, height };

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

function toMermaid(root) {
  let r = 'mindmap\n';
  function w(n, d) {
    if (!n) return;
    const safeText = (!n.text || n.text === 'undefined') ? (d === 1 ? 'Chủ đề chính' : 'Nhánh mới') : n.text;
    const shape = d === 1 ? `((${safeText}))` : `(${safeText})`;
    let meta = '';
    const cleanId = n.id;
    // Store HSL colors as-is; strip # only from hex colors
    if (n.color) meta += `:::color-${n.color.startsWith('hsl') ? n.color : n.color.replace('#', '')}`;
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
function updateNode(root, id, upd) {
  if (root.id === id) return { ...root, ...upd };
  const children = Array.isArray(root.children) ? root.children : [];
  return { ...root, children: children.map(c => updateNode(c, id, upd)) };
}

function addChild(root, pid, depth) {
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
function removeNode(root, id) {
  const children = Array.isArray(root.children) ? root.children : [];
  return {
    ...root,
    children: children
      .filter(c => c.id !== id)
      .map(c => removeNode(c, id))
  };
}
function findDepth(root, id, d = 0) {
  if (root.id === id) return d;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const c of children) { const r = findDepth(c, id, d + 1); if (r >= 0) return r; }
  return -1;
}
function flattenTree(node, depth = 0) {
  const r = [{ id: node.id, text: node.text, depth, color: node.color, width: node.width, height: node.height }];
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach(c => r.push(...flattenTree(c, depth + 1))); return r;
}
function findNode(root, id) {
  if (root.id === id) return root;
  const children = Array.isArray(root.children) ? root.children : [];
  for (const c of children) { const r = findNode(c, id); if (r) return r; }
  return null;
}
function getDescendantIds(node) {
  const ids = [node.id];
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach(c => ids.push(...getDescendantIds(c)));
  return ids;
}

// ===== LAYOUT =====
function stH(node, sizeMap) {
  const children = Array.isArray(node.children) ? node.children : [];
  const h = sizeMap?.[node.id]?.h || node.height || NODE_H;
  if (children.length === 0) return h;
  const childSum = children.reduce((acc, c) => acc + stH(c, sizeMap), 0);
  const gapSum = (children.length - 1) * V_GAP;
  return Math.max(h, childSum + gapSum);
}

// Pure auto-layout: computes ideal positions based only on tree structure and node sizes.
// Does NOT use stored x/y positions — that's mergeRecursive's job.
function computePositions(root, sizeMap) {
  const pos = {};
  if (!root) return pos;
  const rw = sizeMap?.[root.id]?.w || root.width || Math.max(estW(root.text || ""), 140);
  const rh = sizeMap?.[root.id]?.h || root.height || Math.max(NODE_H, 80);
  pos[root.id] = { x: 0, y: 0, w: rw, h: rh, depth: 0, text: root.text };

  const left = [];
  const right = [];
  root.children.forEach((c, i) => {
    if (i % 2 === 0) right.push(c);
    else left.push(c);
  });

  function layoutSide(parent, children, dir, depth) {
    const pp = pos[parent.id];
    const px = pp.x, py = pp.y;

    const totalH = children.reduce((s, c) => s + stH(c, sizeMap) + V_GAP, 0) - V_GAP;
    let cy = py - totalH / 2;

    const widths = children.map(c => sizeMap?.[c.id]?.w || c.width || estW(c.text));
    const maxCW = Math.max(...widths, NODE_MIN_W);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const sh = stH(child, sizeMap);
      const cw = widths[i];
      const ch = sizeMap?.[child.id]?.h || child.height || NODE_H;

      const centerY = cy + sh / 2;
      const baseDist = pp.w / 2 + H_PADDING + maxCW / 2;
      const cx = px + dir * (baseDist - (maxCW - cw) / 2);

      pos[child.id] = { x: cx, y: centerY, w: cw, h: ch, depth, text: child.text };

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

// ===== SVG CONNECTION PATH — Smooth organic cubic Bézier =====
// Uses asymmetric tension: high initial tangent pull (0.55) + subtle
// mid-curve S-bend that avoids the robotic 90-degree elbow feel.
function bezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Tension scales with both axes for a more natural arc
  const tensionX = Math.max(30, absDx * 0.55);
  const tensionY = absDy * 0.12; // slight S-curve lift

  const signX = dx > 0 ? 1 : -1;

  // CP1: depart from parent with horizontal bias + subtle vertical drift
  const cp1x = x1 + signX * tensionX;
  const cp1y = y1 + tensionY;
  // CP2: arrive at child with horizontal bias + mirror drift
  const cp2x = x2 - signX * tensionX;
  const cp2y = y2 - tensionY;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ===== COMPONENT =====
const InteractiveMindmap = forwardRef<any, any>(({ chart, onCodeChange, documentId, zoom = 1, onUndoRedoStateChange }, ref) => {
  const [tree, setTree] = useState(null);
  const [positions, setPositions] = useState({});
  const lastExportedRef = useRef('');
  const lastStructureRef = useRef('');
  const storageKey = `mindmap-pos-${documentId || 'default'}`;

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [menuMode, setMenuMode] = useState(null);
  const [editText, setEditText] = useState('');

  // Unified Undo/Redo tracking both Structure (Code) and Layout (Positions)
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const MAX_HISTORY = 40;

  const updateUndoRedoState = useCallback(() => {
    onUndoRedoStateChange?.(historyRef.current.length > 0, redoRef.current.length > 0);
  }, [onUndoRedoStateChange]);

  // Notify parent of initial state on mount
  useEffect(() => {
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const pushSnapshot = useCallback(() => {
    if (!treeRef.current) return;
    const currentCode = toMermaid(treeRef.current);
    const snapshot = {
      code: currentCode,
      positions: { ...posRef.current }
    };

    // Prevent duplicate consecutive snapshots
    const last = historyRef.current[historyRef.current.length - 1];
    if (last && last.code === snapshot.code && JSON.stringify(last.positions) === JSON.stringify(snapshot.positions)) {
      return;
    }

    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
    redoRef.current = []; // Clear redo on action
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    const currentSnapshot = {
      code: toMermaid(treeRef.current),
      positions: { ...posRef.current }
    };

    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    redoRef.current = [currentSnapshot, ...redoRef.current.slice(0, MAX_HISTORY - 1)];

    // Apply previous state
    const parsed = parseMermaid(prev.code);
    if (parsed) {
      setTree(parsed);
      treeRef.current = parsed;
      lastExportedRef.current = prev.code;
      if (onCodeChange) onCodeChange(prev.code);
    }
    setPositions(prev.positions);
    posRef.current = prev.positions;

    updateUndoRedoState();
  }, [onCodeChange, updateUndoRedoState]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) return;

    const currentSnapshot = {
      code: toMermaid(treeRef.current),
      positions: { ...posRef.current }
    };

    const next = redoRef.current[0];
    redoRef.current = redoRef.current.slice(1);
    historyRef.current = [...historyRef.current, currentSnapshot];

    // Apply next state
    const parsed = parseMermaid(next.code);
    if (parsed) {
      setTree(parsed);
      treeRef.current = parsed;
      lastExportedRef.current = next.code;
      if (onCodeChange) onCodeChange(next.code);
    }
    setPositions(next.positions);
    posRef.current = next.positions;

    updateUndoRedoState();
  }, [onCodeChange, updateUndoRedoState]);

  // EXPORT ENGINE
  useImperativeHandle(ref, () =>({
    downloadImage: () => {
      if (!svgRef.current || Object.keys(positions).length === 0) return;

      const svg = svgRef.current;
      const posValues = (Object.values(positions) as any[]);
      const minX = Math.min(...posValues.map(p => p.x - p.w / 2)) - 100;
      const maxX = Math.max(...posValues.map(p => p.x + p.w / 2)) + 100;
      const minY = Math.min(...posValues.map(p => p.y - p.h / 2)) - 100;
      const maxY = Math.max(...posValues.map(p => p.y + p.h / 2)) + 100;

      const exportW = maxX - minX;
      const exportH = maxY - minY;

      const clone = svg.cloneNode(true);

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
        svg { background: ${bg}; font-family: 'Inter', sans-serif; }
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
      historyRef.current = [];
      redoRef.current = [];
      updateUndoRedoState();
    },
    undo: undo,
    redo: redo,
    pushSnapshot: pushSnapshot,
    getPositions: () =>({ ...posRef.current }),
    forceSetPositions: (newPos) => {
      setPositions(newPos);
      posRef.current = newPos;
      isManualChangeRef.current = true;
    }
  }));

  // Refs for listeners
  const svgRef = useRef(null);
  const treeRef = useRef(null);
  const posRef = useRef({});
  const dragRef = useRef(null);

  const resizeRef = useRef(null);

  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { posRef.current = positions; }, [positions]);

  const isManualChangeRef = useRef(false);


  // AUTO-PERSIST LAYOUT every change instantly
  useEffect(() => {
    if (Object.keys(positions).length > 0 && lastStructureRef.current) {
      const layoutWithMeta = {};
      const flat = tree ? flattenTree(tree) : [];

      Object.keys(positions).forEach(id => {
        const node = flat.find(n => n.id === id);
        layoutWithMeta[id] = {
          ...positions[id],
          text: node?.text || ''
        };
      });

      localStorage.setItem(storageKey, JSON.stringify({
        layout: layoutWithMeta,
        hash: lastStructureRef.current
      }));
      isManualChangeRef.current = false;
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

    setPositions(prev => {
      // Step 1 stored layout data
      const savedData = localStorage.getItem(storageKey);
      let stored = {};
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          stored = parsed.layout || {};
        } catch (e) { }
      }

      // Step 2 with current in-memory state (handles rapid successive adds)
      const treeIds = new Set(flattenTree(tree).map(n => n.id));
      Object.keys(prev).forEach(id => {
        if (treeIds.has(id) && prev[id]) {
          stored[id] = { ...stored[id], ...prev[id] };
        }
      });

      // Step 3 a size-only map for auto-layout computation
      const sizeMap = {};
      Object.keys(stored).forEach(id => {
        if (stored[id]) {
          sizeMap[id] = { w: stored[id].w, h: stored[id].h };
        }
      });

      // Step 4 pure auto-layout (determines ideal positions based on tree structure)
      const autoLayout = computePositions(tree, sizeMap);

      // Step 5 auto-layout with stored positions + recursive parent shifts
      const final = {};

      const mergeRecursive = (node, parentShift = { dx: 0, dy: 0 }) => {
        const auto = autoLayout[node.id];
        if (!auto) return;

        let currentShift = { ...parentShift };
        let finalPos;

        const saved = stored[node.id];
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          // Absolute position recovery
          finalPos = {
            x: saved.x,
            y: saved.y,
            w: saved.w || auto.w,
            h: saved.h || auto.h,
            depth: auto.depth,
            text: saved.text || node.text,
          };
          // Update shift for children: how much does THIS manual pos differ from its IDEAL auto pos?
          currentShift = { dx: finalPos.x - auto.x,
            dy: finalPos.y - auto.y
          };
        } else {
          // Relative recovery: use auto-layout + parent's shift
          finalPos = {
            ...auto,
            x: auto.x + parentShift.dx,
            y: auto.y + parentShift.dy,
            text: node.text,
          };
        }

        final[node.id] = finalPos;
        node.children?.forEach(child => mergeRecursive(child, currentShift));
      };

      if (tree) mergeRecursive(tree);

      const flat = tree ? flattenTree(tree) : [];

      // Step 6 persistence — save to localStorage right now
      // We merge with 'stored' to preserve positions of nodes that might be 
      // temporarily missing from the tree (due to Undo/Redo or structural edits).
      const layoutToSave = { ...stored };
      Object.keys(final).forEach(id => {
        const n = flat.find(n => n.id === id);
        layoutToSave[id] = { ...final[id], text: n?.text || layoutToSave[id]?.text || '' };
      });

      localStorage.setItem(storageKey, JSON.stringify({
        layout: layoutToSave,
        hash: currentStructure
      }));

      posRef.current = final;
      return final;
    });
  }, [tree, storageKey]);

  // Shared update wrapper that handles both full tree replacement and partial node updates
  const applyUpdate = useCallback((target, updates = null, skipHistory = false) => {
    if (!tree) return;

    if (!skipHistory) {
      pushSnapshot();
    }

    let newTree;
    if (typeof target === 'string') {
      newTree = JSON.parse(JSON.stringify(tree));
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
  }, [tree, onCodeChange, pushSnapshot]);

  // === DRAG HANDLERS ===
  const toSvgCoords = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
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

  // Touch equivalent of handleNodeMouseDown
  const handleNodeTouchStart = useCallback((e, nodeId) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    // Don't preventDefault here to allow scrolling until we confirm it's a drag
    if (!treeRef.current || resizeRef.current) return;
    const node = findNode(treeRef.current, nodeId);
    if (!node) return;
    const touch = e.touches[0];
    const ctm = svgRef.current?.getScreenCTM()?.inverse() || null;
    const svgPt = toSvgCoords(touch.clientX, touch.clientY);
    dragRef.current = {
      nodeId,
      descendantIds: getDescendantIds(node),
      startX: svgPt.x,
      startY: svgPt.y,
      snapPositions: { ...posRef.current },
      startCTM: ctm
    };
    document.body.classList.add('select-none');
  }, [toSvgCoords]);

  const handleResizeMouseDown = useCallback((e, nodeId, dir: 'tl' | 'tr' | 'bl' | 'br') => {
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
      startCTM: ctm,
      startSnapshot: { ...posRef.current }
    };
    dragRef.current = null;
    document.body.classList.add('select-none');
  }, [toSvgCoords]);

  useEffect(() => {
    const onMouseMove = (e) => {
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

        // Performance FIX ONLY the local positions state during mouse move
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
            y: p.y - nh / 2 - vb.y
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
      isManualChangeRef.current = true; // MARK
    };
    const onMouseUp = (e) => {
      isManualChangeRef.current = true;

      // 1. Handle Resize Completion
      if (resizeRef.current) {
        const rs = resizeRef.current;
        const finalPos = posRef.current[rs.nodeId];

        // Push pre-resize state to history
        const snapshot = {
          code: toMermaid(treeRef.current),
          positions: rs.startSnapshot
        };
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
        redoRef.current = [];
        updateUndoRedoState();

        if (finalPos) {
          applyUpdate(rs.nodeId, { width: finalPos.w, height: finalPos.h }, true);
        }
        resizeRef.current = null;
        dragRef.current = null;
        document.body.classList.remove('select-none');
        return;
      }

      // 2. Handle Drag Completion
      const ds = dragRef.current;
      if (!ds) {
        document.body.classList.remove('select-none');
        return;
      }

      const svgPt = toSvgCoords(e.clientX, e.clientY);
      const dx = Math.abs(svgPt.x - ds.startX);
      const dy = Math.abs(svgPt.y - ds.startY);

      // If actually dragged (not just a click), push to undo history
      if (dx > 5 || dy > 5) {
        const snapshot = {
          code: toMermaid(treeRef.current),
          positions: ds.snapPositions
        };
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot];
        redoRef.current = [];
        updateUndoRedoState();
      }

      // Handle Click (Select)
      if (dx < 6 && dy < 6) {
        const p = posRef.current[ds.nodeId];
        if (p && svgRef.current) {
          const vb = svgRef.current.viewBox.baseVal;
          setSelectedNodeId(ds.nodeId);
          setMenuPos({
            x: p.x - vb.x,
            y: p.y - p.h / 2 - vb.y
          });
          setMenuMode('main');
        }
      }

      dragRef.current = null;
      document.body.classList.remove('select-none');
    };

    const onTouchMove = (e) => {
      if (!dragRef.current && !resizeRef.current) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      const ds = dragRef.current;
      if (ds) {
        // Compute SVG delta using toSvgCoords — avoids CTM matrix bug on Safari mobile
        const svgPt = toSvgCoords(touch.clientX, touch.clientY);
        const dx = svgPt.x - ds.startX;
        const dy = svgPt.y - ds.startY;
        const nextPos = { ...ds.snapPositions };
        for (const id of ds.descendantIds) {
          if (nextPos[id]) {
            nextPos[id] = { ...nextPos[id], x: nextPos[id].x + dx, y: nextPos[id].y + dy };
          }
        }
        setPositions(nextPos);
        posRef.current = nextPos;
        isManualChangeRef.current = true;
      }
    };
    const onTouchEnd = (e) => {
      const ds = dragRef.current;
      if (!ds && !resizeRef.current) return;
      if (ds) {
        const touch = e.changedTouches[0];
        const svgPt = toSvgCoords(touch.clientX, touch.clientY);
        const dx = Math.abs(svgPt.x - ds.startX);
        const dy = Math.abs(svgPt.y - ds.startY);
        // Push undo snapshot if actually dragged
        if (dx > 5 || dy > 5) {
          const snapshot = { code: toMermaid(treeRef.current), positions: ds.snapPositions };
          historyRef.current = [...historyRef.current.slice(-(40 - 1)), snapshot];
          redoRef.current = [];
          updateUndoRedoState();
        }
        // Tap = show context menu
        if (dx < 6 && dy < 6) {
          const p = posRef.current[ds.nodeId];
          if (p && svgRef.current) {
            const vb = svgRef.current.viewBox.baseVal;
            setSelectedNodeId(ds.nodeId);
            setMenuPos({ x: p.x - vb.x, y: p.y - p.h / 2 - vb.y });
            setMenuMode('main');
          }
        }
        dragRef.current = null;
        document.body.classList.remove('select-none');
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [toSvgCoords]);

  // Close menu
  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = () => { setSelectedNodeId(null); setMenuMode(null); };
    const t = setTimeout(() => window.addEventListener('click', handler), 100);
    return () => { clearTimeout(t); window.removeEventListener('click', handler); };
  }, [selectedNodeId]);

  // === ACTIONS ===
  const doAddChild = () => { if (tree && selectedNodeId) applyUpdate(addChild(tree, selectedNodeId, findDepth(tree, selectedNodeId)), null); };
  const doDelete = () => { if (tree && selectedNodeId && selectedNodeId !== tree.id) applyUpdate(removeNode(tree, selectedNodeId), null); };
  const doStartEdit = () => {
    const flat = tree ? flattenTree(tree) : [];
    const n = flat.find(n => n.id === selectedNodeId);
    if (n) { setEditText(n.text); setMenuMode('edit'); }
  };
  const doCommitEdit = () => {
    if (tree && selectedNodeId && editText.trim()) {
      applyUpdate(updateNode(tree, selectedNodeId, { text: editText.trim() }), null);
    }
    setMenuMode(null);
    setSelectedNodeId(null);
  };
  const doColorChange = (c) => { if (tree && selectedNodeId) applyUpdate(updateNode(tree, selectedNodeId, { color: c }), null); };

  // === COMPUTE VIEW ===
  const viewBox = useMemo(() => {
    const ids = Object.keys(positions);
    if (!ids.length) return { minX: -500, minY: -400, w: 1000, h: 800 };

    // Fixed viewBox calculation to allow root/overall movement to be perceptible
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
    const conns = [];
    function walk(node, depth) {
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
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
          {/* Layered spinner — outer ring rotates, inner ring pulses */}
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-[1.5px] border-[hsl(239_68%_58%/0.15)] rounded-full" />
            <div className="absolute inset-0 border-[1.5px] border-t-[hsl(239_68%_58%)] border-r-[hsl(239_68%_58%/0.3)] rounded-full animate-spin" />
            <div className="absolute inset-[4px] border-[1.5px] border-[hsl(263_70%_62%/0.12)] rounded-full" />
            <div className="absolute inset-[4px] border-[1.5px] border-b-[hsl(263_70%_62%)] border-l-[hsl(263_70%_62%/0.3)] rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--muted-light)]">Đang xây dựng…</p>
        </div>
      </div>
    );
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
            const pn = findNode(tree, c.parentId);
            const cn = findNode(tree, c.childId);
            if (!pn || !cn) return null;
            // Fixed userSpaceOnUse to prevent gradients from disappearing on horizontal/vertical lines
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
          {/* Refined shadow — faint, lifted, two-layer */}
          <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4"  floodColor="hsl(222 47% 4%)" floodOpacity="0.10" />
            <feDropShadow dx="0" dy="8" stdDeviation="14" floodColor="hsl(222 47% 4%)" floodOpacity="0.07" />
          </filter>
          {/* Selection glow — brand hue */}
          <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="hsl(239 68% 58%)" floodOpacity="0.55" />
            <feDropShadow dx="0" dy="4" stdDeviation="6"  floodColor="hsl(239 68% 58%)" floodOpacity="0.25" />
          </filter>
          {/* Root node aura */}
          <filter id="root-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="hsl(239 62% 50%)" floodOpacity="0.30" />
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="hsl(0 0% 0%)"    floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Connection paths — organic, tapered, gradient-lit */}
        {connections.map(c => {
          const pp = positions[c.parentId];
          const cp = positions[c.childId];
          if (!pp || !cp) return null;

          const gid = `g-${c.parentId}-${c.childId}`.replace(/[^a-zA-Z0-9-]/g, '_');
          // Taper stroke: root connectors are heavier, leaf connectors are hairlines
          const strokeW = Math.max(1.2, 3.2 - c.depth * 0.6);

          return (
            <path
              key={`e-${c.parentId}-${c.childId}`}
              d={bezierPath(pp.x, pp.y, cp.x, cp.y)}
              fill="none"
              stroke={`url(#${gid})`}
              strokeWidth={strokeW}
              strokeLinecap="round"
              opacity={0.72}
            />
          );
        })}

        {/* Nodes */}
        {allNodes.map(n => {
          const p = positions[n.id];
          if (!p) return null;
          const isRoot = p.depth === 0;
          const isSelected = n.id === selectedNodeId;
          // Root: larger, bolder; branches: slightly smaller — đều dùng Inter
          const fSize = isRoot ? 24 : 13;
          const fontWeight = isRoot ? '700' : '600';
          const rx = isRoot ? p.h / 2 : Math.min(p.h / 2, 14);
          const filter = isSelected
            ? 'url(#node-glow)'
            : isRoot
              ? 'url(#root-glow)'
              : 'url(#node-shadow)';

          return (
            <g
              key={n.id}
              data-node-id={n.id}
              data-mindmap-node="true"
              onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
              onTouchStart={(e) => handleNodeTouchStart(e, n.id)}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
            >
              {/* Selection ring — dashed, brand-indigo */}
              {isSelected && (
                <rect
                  x={p.x - p.w / 2 - 6} y={p.y - p.h / 2 - 6}
                  width={p.w + 12} height={p.h + 12}
                  rx={rx + 4} ry={rx + 4}
                  fill="none"
                  stroke="hsl(239 68% 68%)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  opacity={0.9}
                  className="animate-pulse"
                />
              )}

              {/* Main capsule / pill shape */}
              <rect
                x={p.x - p.w / 2}
                y={p.y - p.h / 2}
                width={p.w}
                height={p.h}
                rx={rx}
                ry={rx}
                fill={n.color}
                filter={filter}
              />

              {/* Inner highlight — top edge luminosity stroke */}
              <rect
                x={p.x - p.w / 2 + 1}
                y={p.y - p.h / 2 + 1}
                width={p.w - 2}
                height={Math.min(p.h * 0.45, 28)}
                rx={rx - 1}
                ry={rx - 1}
                fill="white"
                opacity={isRoot ? 0.12 : 0.09}
                className="pointer-events-none"
              />

              {/* Text-line, refined typography */}
              <text
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fill="white"
                fontSize={fSize}
                fontWeight={fontWeight}
                fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                letterSpacing={isRoot ? '-0.02em' : '-0.015em'}
                className="pointer-events-none select-none"
              >
                {(() => {
                  const lines = wrapText(n.text || '', p.w, p.h, fSize);
                  const lineHeight = fSize * 1.35;
                  const totalH = lines.length * lineHeight;
                  const firstLineY = -(totalH / 2) + (lineHeight / 2);
                  return lines.map((line, i) =>(
                    <tspan key={i} x={p.x} dy={i === 0 ? firstLineY : lineHeight}>{line}</tspan>
                  ));
                })()}
              </text>

              {/* L-bracket resize handles */}
              {isSelected && (() => {
                const off = 10;
                const len = 14;
                return (
                  <g className="resize-handles" stroke="hsl(239 68% 68%)" strokeWidth={2} fill="none" strokeLinecap="round">
                    {/* Top Left */}
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y - p.h / 2 - off + len} V ${p.y - p.h / 2 - off} H ${p.x - p.w / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nwse-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'tl')} />
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y - p.h / 2 - off + len} V ${p.y - p.h / 2 - off} H ${p.x - p.w / 2 - off + len}`} pointerEvents="none" />
                    {/* Top Right */}
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y - p.h / 2 - off} H ${p.x + p.w / 2 + off} V ${p.y - p.h / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nesw-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'tr')} />
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y - p.h / 2 - off} H ${p.x + p.w / 2 + off} V ${p.y - p.h / 2 - off + len}`} pointerEvents="none" />
                    {/* Bottom Left */}
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y + p.h / 2 + off - len} V ${p.y + p.h / 2 + off} H ${p.x - p.w / 2 - off + len}`} stroke="transparent" strokeWidth={24} cursor="nesw-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'bl')} />
                    <path d={`M ${p.x - p.w / 2 - off} ${p.y + p.h / 2 + off - len} V ${p.y + p.h / 2 + off} H ${p.x - p.w / 2 - off + len}`} pointerEvents="none" />
                    {/* Bottom Right */}
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y + p.h / 2 + off} H ${p.x + p.w / 2 + off} V ${p.y + p.h / 2 + off - len}`} stroke="transparent" strokeWidth={24} cursor="nwse-resize" onMouseDown={e => handleResizeMouseDown(e, n.id, 'br')} />
                    <path d={`M ${p.x + p.w / 2 + off - len} ${p.y + p.h / 2 + off} H ${p.x + p.w / 2 + off} V ${p.y + p.h / 2 + off - len}`} pointerEvents="none" />
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      {/* ═══ CONTEXT MENU — Sophisticated SaaS style ═══ */}
      {selectedNodeId && menuMode && (() => {
        const flat = tree ? flattenTree(tree) : [];
        const node = flat.find(n => n.id === selectedNodeId);
        if (!node) return null;
        const isRoot = node.depth === 0;
        const menuBaseStyle = {
          left: menuPos.x,
          top: menuPos.y,
          transform: `translate(-50%, calc(-100% - 14px)) scale(${Math.sqrt(1 / zoom)})`,
          transformOrigin: 'bottom center',
        };

        if (menuMode === 'edit') {
          return (
            <div className="absolute z-[999] animate-fade-up" style={menuBaseStyle} onClick={e => e.stopPropagation()}>
              {/* Arrow pointer */}
              <div className="flex flex-col items-center">
                <div
                  className="w-[300px] rounded-2xl shadow-[0_24px_48px_hsl(222_47%_4%/0.14),0_4px_12px_hsl(222_47%_4%/0.08)] border border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-2xl p-4"
                >
                  <p className="text-[10px] font-bold text-[var(--muted-light)] uppercase tracking-[0.12em] mb-3 px-1">Chỉnh sửa nội dung</p>
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') doCommitEdit();
                      if (e.key === 'Escape') { setMenuMode(null); setSelectedNodeId(null); }
                      e.stopPropagation();
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] font-medium outline-none focus:ring-2 focus:ring-[hsl(239_68%_58%/0.35)] focus:border-[hsl(239_68%_58%/0.5)] transition-all placeholder:text-[var(--muted-light)]"
                    placeholder="Nhập nội dung…"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={doCommitEdit}
                      className="flex-1 py-2.5 bg-[hsl(239_68%_58%)] hover:bg-[hsl(239_62%_50%)] active:scale-95 text-white rounded-xl text-[11px] font-bold shadow-[0_4px_12px_hsl(239_68%_58%/0.30)] transition-all"
                    >Lưu thay đổi</button>
                    <button
                      onClick={() => setMenuMode('main')}
                      className="px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--card-bg-hover)] text-[var(--muted)] rounded-xl text-[11px] font-bold transition-all"
                    >Hủy</button>
                  </div>
                </div>
                <div className="w-3 h-1.5 bg-[var(--card-bg)] border-x border-b border-[var(--border-color)] clip-arrow" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </div>
            </div>
          );
        }

        if (menuMode === 'color') {
          return (
            <div className="absolute z-[999] animate-fade-up" style={menuBaseStyle} onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center">
                <div className="rounded-2xl shadow-[0_24px_48px_hsl(222_47%_4%/0.14),0_4px_12px_hsl(222_47%_4%/0.08)] border border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-2xl p-4">
                  <p className="text-[10px] font-bold text-[var(--muted-light)] uppercase tracking-[0.12em] mb-3 px-1">Màu nhánh</p>
                  <div className="grid grid-cols-6 gap-2">
                    {NODE_COLORS.map(c =>(
                      <button
                        key={c.value}
                        onClick={e => { e.stopPropagation(); doColorChange(c.value); }}
                        title={c.name}
                        className="w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110 active:scale-90"
                        style={{
                          background: c.value,
                          boxShadow: c.value === node.color
                            ? `0 0 0 2px var(--card-bg), 0 0 0 3.5px ${c.value}`
                            : `0 1px 3px hsl(0 0% 0% / 0.15)`
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuMode('main'); }}
                    className="w-full mt-3 py-2 text-[10px] font-bold text-[var(--muted-light)] hover:text-[var(--foreground)] transition-colors"
                  >← Quay lại</button>
                </div>
                <div className="w-3 h-1.5 bg-[var(--card-bg)] border-x border-b border-[var(--border-color)]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
              </div>
            </div>
          );
        }

        // Main toolbar menu
        return (
          <div className="absolute z-[999] animate-fade-up" style={menuBaseStyle} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="rounded-2xl shadow-[0_24px_48px_hsl(222_47%_4%/0.14),0_4px_12px_hsl(222_47%_4%/0.08)] border border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-2xl p-1.5 flex items-center gap-0.5">
                {/* Edit */}
                <button
                  onClick={e => { e.stopPropagation(); doStartEdit(); }}
                  className="group w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(239_68%_58%)] hover:bg-[hsl(239_68%_58%/0.08)] transition-all active:scale-90"
                  title="Sửa nội dung"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {/* Add child */}
                <button
                  onClick={e => { e.stopPropagation(); doAddChild(); }}
                  className="group w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(158_64%_44%)] hover:bg-[hsl(158_64%_44%/0.08)] transition-all active:scale-90"
                  title="Thêm nhánh con"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                </button>
                {/* Divider */}
                <div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />
                {/* Color */}
                <button
                  onClick={e => { e.stopPropagation(); setMenuMode('color'); }}
                  className="group w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[hsl(263_70%_62%/0.08)] transition-all active:scale-90"
                  title="Đổi màu"
                >
                  <span
                    className="material-symbols-outlined text-[18px] transition-colors"
                    style={{ color: node.color }}
                  >palette</span>
                </button>
                {/* Delete */}
                {!isRoot && (
                  <>
                    <div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />
                    <button
                      onClick={e => { e.stopPropagation(); doDelete(); }}
                      className="group w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(343_85%_58%)] hover:bg-[hsl(343_85%_58%/0.08)] transition-all active:scale-90"
                      title="Xóa nhánh"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </>
                )}
              </div>
              {/* Caret */}
              <div
                className="w-3 h-1.5 bg-[var(--card-bg)] border-x border-b border-[var(--border-color)]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default InteractiveMindmap;
