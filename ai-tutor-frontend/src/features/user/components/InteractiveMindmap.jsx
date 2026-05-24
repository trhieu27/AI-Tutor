import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { INTERACTIVE_MINDMAP_TEXTS } from '@/shared/constants/texts';

// ── Palette ──────────────────────────────────────────────────────────────────
const NODE_COLORS = [
  { name: 'Verdant', value: 'hsl(166 61% 35%)' },
  { name: 'Rose', value: 'hsl(4 72% 52%)' },
  { name: 'Sky', value: 'hsl(199 89% 48%)' },
  { name: 'Emerald', value: 'hsl(158 64% 44%)' },
  { name: 'Amber', value: 'hsl(38 92% 50%)' },
  { name: 'Cobalt', value: 'hsl(218 82% 55%)' },
  { name: 'Pink', value: 'hsl(328 81% 58%)' },
  { name: 'Teal', value: 'hsl(173 58% 42%)' },
  { name: 'Red', value: 'hsl(4 86% 58%)' },
  { name: 'Blue', value: 'hsl(217 91% 60%)' },
  { name: 'Lime', value: 'hsl(84 81% 44%)' },
  { name: 'Orange', value: 'hsl(27 96% 54%)' },
];

// ── Layout constants ──────────────────────────────────────────────────────────
const V_GAP = 16;   // vertical gap between consecutive nodes
const H_INDENT = 40; // horizontal indent per depth level
const NODE_H = 48;
const NODE_MIN_W = 220;
const PAD = 120;
const LAYOUT_VER = 'v17-folder';
const RESIZE_SNAP = 20; // snap resize to grid to prevent text flickering

// ── Text wrap (with cache to prevent flickering during resize) ───────────────
const _wrapCache = new Map();
function wrapText(text, w, h, fs) {
  // Snap dimensions to grid so small changes don't cause re-wraps
  const sw = Math.round(w / RESIZE_SNAP) * RESIZE_SNAP;
  const sh = Math.round(h / RESIZE_SNAP) * RESIZE_SNAP;
  const key = `${text}|${sw}|${sh}|${fs}`;
  if (_wrapCache.has(key)) return _wrapCache.get(key);
  // Keep cache bounded
  if (_wrapCache.size > 500) _wrapCache.clear();

  const cw = fs * 0.55, pad = 24;
  const maxCh = Math.max(8, Math.floor((sw - pad) / cw));
  const maxLn = Math.max(2, Math.floor((sh - 10) / (fs * 1.25)));
  const words = (text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + word).length <= maxCh) { cur += (cur ? ' ' : '') + word; }
    else {
      if (lines.length + 1 >= maxLn) {
        const remaining = cur ? cur + ' ' + word : word;
        lines.push(remaining.length > maxCh ? remaining.slice(0, maxCh - 1) + '…' : remaining);
        _wrapCache.set(key, lines);
        return lines;
      }
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  const result = lines.length ? lines : [text || ''];
  _wrapCache.set(key, result);
  return result;
}

// ── Estimated node width ──────────────────────────────────────────────────────
function estW(text, fs = 13) {
  // Must match wrapText: cw = fs * 0.55, pad = 24
  // Add +16 buffer to ensure maxCh > text.length (no wrap/truncation)
  return Math.max(NODE_MIN_W, Math.ceil((text || '').length * (fs * 0.55)) + 24 + 16);
}

// ── Parser ────────────────────────────────────────────────────────────────────
function parseMermaid(code) {
  const lines = code.split('\n').filter(l => l.trim());
  let si = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() === 'mindmap') { si = i + 1; break; }
  }
  if (si < 0) return null;

  const stack = [];
  let root = null;
  let nid = 0;
  const seen = new Map();
  const uid = base => {
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n - 1}`;
  };

  for (let i = si; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)[1].length;
    let raw = line.trim();
    if (!raw) continue;

    // strip metadata
    const colorM = raw.match(/:::color-(hsl\([^)]+\)|#?[a-fA-F0-9]{3,6})/);
    const color = colorM ? (colorM[1].startsWith('hsl') ? colorM[1] : `#${colorM[1].replace('#', '')}`) : '';
    const wM = raw.match(/:::w-(\d+)/); const width = wM ? +wM[1] : undefined;
    const hM = raw.match(/:::h-(\d+)/); const height = hM ? +hM[1] : undefined;
    raw = raw.replace(/:::color-(?:hsl\([^)]+\)|#?[a-fA-F0-9]{3,6})/g, '').replace(/:::w-\d+/g, '').replace(/:::h-\d+/g, '').trim();

    // strip shape brackets
    const idM = raw.match(/^([a-zA-Z0-9_-]+)\s*[\(\[\{]/);
    let id = idM ? idM[1] : `node-${++nid}`;
    let txt = raw.replace(/^[a-zA-Z0-9_-]+\s*(?=[\(\[\{])/, '');
    let ch = true;
    while (ch) {
      ch = false;
      for (const [o, c] of [['((', '))'], ['{{', '}}'], ['(', ')'], ['[', ']']]) {
        if (txt.startsWith(o) && txt.endsWith(c)) {
          txt = txt.slice(o.length, txt.length - c.length).trim(); ch = true; break;
        }
      }
    }
    txt = txt.replace(/^[\(\[\{]+/, '').replace(/[\)\]\}]+$/, '').trim() || (stack.length === 0 ? INTERACTIVE_MINDMAP_TEXTS.rootNode : INTERACTIVE_MINDMAP_TEXTS.newNode);

    // unique id
    const slug = txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 12);
    const parentPath = stack.length ? stack[stack.length - 1].path : '';
    id = idM ? uid(id) : uid(`n-${parentPath ? parentPath + '-' : ''}${slug}`);

    const node = { id, text: txt, children: [], color, width, height };

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();

    if (!stack.length) {
      if (!root) root = node;
      if (!node.color) node.color = '#4338ca';
      stack.push({ node, indent, depth: 0, path: id.slice(0, 12) });
    } else {
      const pe = stack[stack.length - 1];
      pe.node.children.push(node);
      const depth = pe.depth + 1;
      if (!node.color) node.color = depth === 1
        ? NODE_COLORS[(pe.node.children.length - 1) % NODE_COLORS.length].value
        : pe.node.color;
      stack.push({ node, indent, depth, path: (pe.path + '-' + id).slice(0, 24) });
    }
  }
  return root;
}

function toMermaid(root) {
  let out = 'mindmap\n';
  const w = (n, d) => {
    if (!n) return;
    const t = n.text || (d === 1 ? INTERACTIVE_MINDMAP_TEXTS.rootNode : INTERACTIVE_MINDMAP_TEXTS.newNode);
    const shape = d === 1 ? `((${t}))` : `(${t})`;
    let meta = '';
    if (n.color) meta += `:::color-${n.color.startsWith('hsl') ? n.color : n.color.replace('#', '')}`;
    if (n.width) meta += `:::w-${n.width}`;
    if (n.height) meta += `:::h-${n.height}`;
    out += '  '.repeat(d) + `${n.id}${shape}${meta}\n`;
    (n.children || []).forEach(c => w(c, d + 1));
  };
  w(root, 1);
  return out;
}

// ── Tree ops ──────────────────────────────────────────────────────────────────
const ch = n => Array.isArray(n.children) ? n.children : [];
function updateNode(root, id, upd) {
  if (root.id === id) return { ...root, ...upd };
  return { ...root, children: ch(root).map(c => updateNode(c, id, upd)) };
}
function addChild(root, pid) {
  if (root.id === pid) {
    const id = `u-${Math.random().toString(36).slice(2, 9)}`;
    return { ...root, children: [...ch(root), { id, text: INTERACTIVE_MINDMAP_TEXTS.newNode, children: [], color: root.color }] };
  }
  return { ...root, children: ch(root).map(c => addChild(c, pid)) };
}
function removeNode(root, id) {
  return { ...root, children: ch(root).filter(c => c.id !== id).map(c => removeNode(c, id)) };
}
function findDepth(root, id, d = 0) {
  if (root.id === id) return d;
  for (const c of ch(root)) { const r = findDepth(c, id, d + 1); if (r >= 0) return r; }
  return -1;
}
function flattenTree(node, depth = 0) {
  return [{ id: node.id, text: node.text, depth, color: node.color, width: node.width, height: node.height },
  ...ch(node).flatMap(c => flattenTree(c, depth + 1))];
}
function findNode(root, id) {
  if (root.id === id) return root;
  for (const c of ch(root)) { const r = findNode(c, id); if (r) return r; }
  return null;
}
function getDescendantIds(node) {
  return [node.id, ...ch(node).flatMap(getDescendantIds)];
}

// ── Layout (folder-style: DFS vertical list, indented per depth) ─────────────
function computePositions(root, sizeMap) {
  if (!root) return {};
  const pos = {};
  const gW = n => sizeMap?.[n.id]?.w || n.width || estW(n.text || '');
  const gH = n => sizeMap?.[n.id]?.h || n.height || NODE_H;

  // DFS walk: place each node sequentially top-to-bottom, indented by depth
  let cursorY = 0;
  function walk(node, depth) {
    const nw = gW(node);
    const nh = gH(node);
    const x = depth * (NODE_MIN_W + H_INDENT) + nw / 2;
    pos[node.id] = { x, y: cursorY + nh / 2, w: nw, h: nh, depth, text: node.text };
    cursorY += nh + V_GAP;
    (node.children || []).forEach(c => walk(c, depth + 1));
  }
  walk(root, 0);
  return pos;
}

// ── Connection path (L-shaped: parent right → down → child left) ─────────────
function bezierPath(x1, y1, x2, y2) {
  // Smooth step-like path: go right, then curve down to child
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

const InteractiveMindmap = forwardRef(({ chart, onCodeChange, documentId, zoom = 1, onUndoRedoStateChange }, ref) => {
  const [tree, setTree] = useState(null);
  const [positions, setPositions] = useState({});
  const [selId, setSelId] = useState(null);
  const [menuMode, setMenuMode] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [editText, setEditText] = useState('');
  const svgRef = useRef(null), treeRef = useRef(null), posRef = useRef({});
  const dragRef = useRef(null), resizeDragRef = useRef(null), histRef = useRef([]), redoRef = useRef([]);
  const lastCodeRef = useRef(''), lastStructRef = useRef('');
  const frozenVbRef = useRef(null); // freeze viewBox during resize to prevent all nodes jumping
  const resizeRafRef = useRef(null); // rAF throttle for resize
  const SK = `mindmap-pos-${documentId || 'default'}-${LAYOUT_VER}`;

  const notifyUR = useCallback(() => onUndoRedoStateChange?.(histRef.current.length > 0, redoRef.current.length > 0), [onUndoRedoStateChange]);

  useEffect(() => {
    const pfx = `mindmap-pos-${documentId || 'default'}`;
    Object.keys(localStorage).filter(k => k.startsWith(pfx) && k !== SK).forEach(k => localStorage.removeItem(k));
  }, [SK]);

  const pushSnap = useCallback(() => {
    if (!treeRef.current) return;
    const snap = { code: toMermaid(treeRef.current), pos: { ...posRef.current } };
    const last = histRef.current[histRef.current.length - 1];
    if (last && last.code === snap.code) return;
    histRef.current = [...histRef.current.slice(-39), snap];
    redoRef.current = [];
    notifyUR();
  }, [notifyUR]);

  const applySnap = useCallback((snap) => {
    const p = parseMermaid(snap.code);
    if (p) { setTree(p); treeRef.current = p; lastCodeRef.current = snap.code; onCodeChange?.(snap.code); }
    setPositions(snap.pos); posRef.current = snap.pos; notifyUR();
  }, [onCodeChange, notifyUR]);

  useImperativeHandle(ref, () => ({
    undo: () => { if (!histRef.current.length) return; const cur = { code: toMermaid(treeRef.current), pos: { ...posRef.current } }; const prev = histRef.current.pop(); redoRef.current = [cur, ...redoRef.current.slice(0, 39)]; applySnap(prev); },
    redo: () => { if (!redoRef.current.length) return; const cur = { code: toMermaid(treeRef.current), pos: { ...posRef.current } }; const nxt = redoRef.current.shift(); histRef.current = [...histRef.current, cur]; applySnap(nxt); },
    pushSnapshot: pushSnap,
    resetLayout: () => { localStorage.removeItem(SK); setTree(null); setPositions({}); treeRef.current = null; posRef.current = {}; lastCodeRef.current = ''; histRef.current = []; redoRef.current = []; notifyUR(); },
    downloadImage: () => {
      if (!svgRef.current) return;
      const pv = Object.values(posRef.current);
      if (!pv.length) return;
      const mx = Math.min(...pv.map(p => p.x - p.w / 2)) - 80, MX = Math.max(...pv.map(p => p.x + p.w / 2)) + 80;
      const my = Math.min(...pv.map(p => p.y - p.h / 2)) - 80, MY = Math.max(...pv.map(p => p.y + p.h / 2)) + 80;
      const W = MX - mx, H = MY - my;
      const scale = 2; // 2x for retina quality
      const cl = svgRef.current.cloneNode(true);
      // ── Strip all selection UI before export ──────────────────────────────
      // 1. Remove dashed selection ring (animate-pulse rect)
      cl.querySelectorAll('.animate-pulse').forEach(el => el.remove());
      // 2. Remove resize handle groups (they come after <text> and have cursor style)
      cl.querySelectorAll('[style*="cursor: nw-resize"], [style*="cursor: ne-resize"], [style*="cursor: sw-resize"], [style*="cursor: se-resize"]').forEach(el => el.remove());
      // 3. Reset glow filter on selected node back to normal shadow
      cl.querySelectorAll('[filter="url(#ng)"]').forEach(el => el.setAttribute('filter', 'url(#ns)'));
      // ─────────────────────────────────────────────────────────────────────
      cl.setAttribute('width', W * scale); cl.setAttribute('height', H * scale);
      cl.setAttribute('viewBox', `${mx} ${my} ${W} ${H}`);
      // Inline a basic background rect so PNG has a background
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', mx); bg.setAttribute('y', my);
      bg.setAttribute('width', W); bg.setAttribute('height', H);
      bg.setAttribute('fill', 'hsl(222 47% 8%)');
      cl.insertBefore(bg, cl.firstChild);
      const svgStr = new XMLSerializer().serializeToString(cl);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      const canvas = document.createElement('canvas');
      canvas.width = W * scale; canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `mindmap-${documentId || 'export'}.png`;
        a.click();
      };
      img.src = dataUrl;
    },
    getPositions: () => ({ ...posRef.current }),
    forceSetPositions: p => { setPositions(p); posRef.current = p; },
  }));

  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { posRef.current = positions; }, [positions]);

  useEffect(() => {
    if (!chart) { setTree(null); lastCodeRef.current = ''; return; }
    if (chart !== lastCodeRef.current) { const p = parseMermaid(chart); if (p) { setTree(p); lastCodeRef.current = chart; } }
  }, [chart]);

  useEffect(() => {
    if (!tree) return;
    const struct = flattenTree(tree).map(n => n.id).join('|');
    lastStructRef.current = struct;
    setPositions(() => {
      // Only restore manual drag positions when the tree structure is identical
      let stored = {};
      try {
        const d = localStorage.getItem(SK);
        if (d) {
          const j = JSON.parse(d);
          // Hash must match exactly — prevents old positions from polluting a new diagram
          if (j.hash === struct) stored = j.layout || {};
        }
      } catch (e) { }
      const sizeMap = {};
      Object.keys(stored).forEach(id => { if (stored[id]) sizeMap[id] = { w: stored[id].w, h: stored[id].h }; });
      const auto = computePositions(tree, sizeMap);
      const final = {};
      // merge: for existing nodes use stored pos; for NEW nodes, offset relative to parent's actual pos
      const merge = (node, parentId) => {
        const a = auto[node.id]; if (!a) return;
        const s = stored[node.id];
        if (s && typeof s.x === 'number') {
          // Existing node with manual position — restore it
          final[node.id] = { ...a, x: s.x, y: s.y, w: s.w || a.w, h: s.h || a.h };
        } else if (parentId && final[parentId] && auto[parentId]) {
          // New node — place relative to parent's ACTUAL position using auto-layout offset
          const autoParent = auto[parentId];
          const dx = a.x - autoParent.x, dy = a.y - autoParent.y;
          final[node.id] = { ...a, x: final[parentId].x + dx, y: final[parentId].y + dy };
        } else {
          final[node.id] = { ...a };
        }
        (node.children || []).forEach(c => merge(c, node.id));
      };
      merge(tree, null);
      const save = {};
      flattenTree(tree).forEach(n => { if (final[n.id]) save[n.id] = { ...final[n.id], text: n.text }; });
      localStorage.setItem(SK, JSON.stringify({ layout: save, hash: struct }));
      posRef.current = final;
      return final;
    });
  }, [tree, SK]);

  // Persist dragged positions. Intentionally omits 'tree' from deps:
  // If 'tree' were included, this would fire with old positions + new tree on the same
  // commit cycle as the layout effect — writing stale positions under the new hash.
  // Using treeRef.current gives us the current tree without making it a trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = treeRef.current;
    if (!t || !Object.keys(positions).length || !lastStructRef.current) return;
    const save = {};
    flattenTree(t).forEach(n => { if (positions[n.id]) save[n.id] = { ...positions[n.id], text: n.text }; });
    localStorage.setItem(SK, JSON.stringify({ layout: save, hash: lastStructRef.current }));
  }, [positions, SK]);

  const toSvg = useCallback((cx, cy) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint(); pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svgRef.current.getScreenCTM().inverse());
  }, []);

  useEffect(() => {
    const getXY = e => {
      if (e.touches && e.touches.length > 0) return { cx: e.touches[0].clientX, cy: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches.length > 0) return { cx: e.changedTouches[0].clientX, cy: e.changedTouches[0].clientY };
      return { cx: e.clientX, cy: e.clientY };
    };
    const onMove = e => {
      const rs = resizeDragRef.current;
      if (rs) {
        if (resizeRafRef.current) return; // already scheduled
        resizeRafRef.current = requestAnimationFrame(() => {
          resizeRafRef.current = null;
          const { cx, cy } = getXY(e);
          const pt = toSvg(cx, cy);
          const next = { ...posRef.current };
          const p = next[rs.id];
          if (p) {
            const newW = Math.max(NODE_MIN_W, Math.round(Math.abs(pt.x - p.x) * 2 / RESIZE_SNAP) * RESIZE_SNAP);
            const newH = Math.max(NODE_H, Math.round(Math.abs(pt.y - p.y) * 2 / RESIZE_SNAP) * RESIZE_SNAP);
            if (newW === p.w && newH === p.h) return;
            next[rs.id] = { ...p, w: newW, h: newH };
            setPositions(next); posRef.current = next;
          }
        });
        return;
      }
      const ds = dragRef.current; if (!ds) return;
      const { cx, cy } = getXY(e);
      const pt = toSvg(cx, cy);
      const dx = pt.x - ds.sx, dy = pt.y - ds.sy;
      const next = { ...ds.snap };
      ds.ids.forEach(id => { if (next[id]) next[id] = { ...next[id], x: next[id].x + dx, y: next[id].y + dy }; });
      setPositions(next); posRef.current = next;
    };
    const onUp = e => {
      if (resizeDragRef.current) {
        if (resizeRafRef.current) { cancelAnimationFrame(resizeRafRef.current); resizeRafRef.current = null; }
        frozenVbRef.current = null; // unfreeze viewBox
        const snap = { code: toMermaid(treeRef.current), pos: resizeDragRef.current.snap };
        histRef.current = [...histRef.current.slice(-39), snap]; redoRef.current = []; notifyUR();
        resizeDragRef.current = null; document.body.classList.remove('select-none'); return;
      }
      const ds = dragRef.current; if (!ds) { document.body.classList.remove('select-none'); return; }
      const { cx, cy } = getXY(e);
      const pt = toSvg(cx, cy);
      const dx = Math.abs(pt.x - ds.sx), dy = Math.abs(pt.y - ds.sy);
      if (dx > 5 || dy > 5) { const snap = { code: toMermaid(treeRef.current), pos: ds.snap }; histRef.current = [...histRef.current.slice(-39), snap]; redoRef.current = []; notifyUR(); }
      if (dx < 6 && dy < 6) {
        const p = posRef.current[ds.id];
        if (p && svgRef.current) { const vb = svgRef.current.viewBox.baseVal; setSelId(ds.id); setMenuPos({ x: p.x - vb.x, y: p.y - p.h / 2 - vb.y }); setMenuMode('main'); }
      }
      dragRef.current = null; document.body.classList.remove('select-none');
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [toSvg, notifyUR]);

  useEffect(() => {
    if (!selId) return;
    const h = () => { setSelId(null); setMenuMode(null); };
    const t = setTimeout(() => window.addEventListener('click', h), 100);
    return () => { clearTimeout(t); window.removeEventListener('click', h); };
  }, [selId]);

  const startDrag = useCallback((e, id) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    if (!treeRef.current) return;
    const node = findNode(treeRef.current, id); if (!node) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const pt = toSvg(cx, cy);
    dragRef.current = { id, ids: getDescendantIds(node), sx: pt.x, sy: pt.y, snap: { ...posRef.current } };
    document.body.classList.add('select-none');
  }, [toSvg]);

  // applyUpdate: mutate tree while preserving current positions.
  // Pre-saves current posRef positions under the NEW tree's hash so that
  // useEffect([tree,SK]) restores them instead of resetting to auto-layout.
  const applyUpdate = useCallback((newTree, skipSnap = false) => {
    if (!skipSnap) pushSnap();
    // Build new struct hash and pre-save live positions for existing nodes
    const newStruct = flattenTree(newTree).map(n => n.id).join('|');
    const save = {};
    flattenTree(newTree).forEach(n => {
      const lp = posRef.current[n.id];
      if (lp) save[n.id] = { ...lp, text: n.text };
    });
    localStorage.setItem(SK, JSON.stringify({ layout: save, hash: newStruct }));
    setTree(newTree);
    treeRef.current = newTree;
    const code = toMermaid(newTree);
    lastCodeRef.current = code;
    if (typeof onCodeChange === 'function') onCodeChange(code);
  }, [pushSnap, SK, onCodeChange]);

  const doEdit = () => { const n = findNode(treeRef.current, selId); if (n) { setEditText(n.text); setMenuMode('edit'); } };
  const doSave = () => { if (treeRef.current && selId && editText.trim()) { applyUpdate(updateNode(treeRef.current, selId, { text: editText.trim() })); } setMenuMode(null); setSelId(null); };
  const doAdd = () => {
    if (!treeRef.current || !selId) return;
    const newId = `u-${Math.random().toString(36).slice(2, 9)}`;
    const addChildWithId = (root, pid) => {
      if (root.id === pid) {
        return { ...root, children: [...(root.children || []), { id: newId, text: INTERACTIVE_MINDMAP_TEXTS.newNode, children: [], color: root.color }] };
      }
      return { ...root, children: (root.children || []).map(c => addChildWithId(c, pid)) };
    };
    applyUpdate(addChildWithId(treeRef.current, selId));
    // Select the new node so it renders on top and user can edit it immediately
    setSelId(newId);
    setMenuMode(null);
  };
  const doDel = () => { if (treeRef.current && selId && selId !== treeRef.current.id) applyUpdate(removeNode(treeRef.current, selId)); };
  const doColor = c => { if (treeRef.current && selId) applyUpdate(updateNode(treeRef.current, selId, { color: c })); };

  const vbComputed = useMemo(() => {
    const ids = Object.keys(positions);
    if (!ids.length) return { x: -600, y: -400, w: 1200, h: 800 };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    ids.forEach(id => { const p = positions[id]; x0 = Math.min(x0, p.x - p.w / 2); x1 = Math.max(x1, p.x + p.w / 2); y0 = Math.min(y0, p.y - p.h / 2); y1 = Math.max(y1, p.y + p.h / 2); });
    return { x: x0 - PAD, y: y0 - PAD, w: Math.max(x1 - x0 + PAD * 2, 1200), h: Math.max(y1 - y0 + PAD * 2, 800) };
  }, [positions]);
  // Freeze viewBox during resize to prevent all nodes from jumping
  const vb = frozenVbRef.current || vbComputed;

  const conns = useMemo(() => {
    if (!tree) return [];
    const r = [];
    const w = (n, d) => { (n.children || []).forEach(c => { r.push({ pid: n.id, cid: c.id, d }); w(c, d + 1); }); };
    w(tree, 1); return r;
  }, [tree]);

  if (!tree || !Object.keys(positions).length) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 border-[1.5px] border-[hsl(166_61%_35%/0.15)] rounded-full" />
            <div className="absolute inset-0 border-[1.5px] border-t-[var(--brand-primary)] rounded-full animate-spin" />
          </div>
          <p className="text-[10px] font-bold font-mono text-[var(--muted-light)]">{INTERACTIVE_MINDMAP_TEXTS.building}</p>
        </div>
      </div>
    );
  }

  // Sort: deeper nodes render above shallower ones (standard);
  // selected node always renders last so it sits on top of all others in SVG.
  const allNodes = flattenTree(tree).sort((a, b) => {
    if (a.id === selId) return 1;
    if (b.id === selId) return -1;
    return a.depth - b.depth;
  });
  const selNode = selId ? findNode(tree, selId) : null;

  return (
    <div className="relative" style={{ width: vb.w, height: vb.h, touchAction: 'none' }}>
      <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={vb.w} height={vb.h} className="select-none" style={{ overflow: 'visible' }}>
        <defs>
          {conns.map(c => {
            const pp = positions[c.pid], cp = positions[c.cid];
            const pn = findNode(tree, c.pid), cn = findNode(tree, c.cid);
            if (!pp || !cp || !pn || !cn) return null;
            const gid = `g-${c.pid}-${c.cid}`.replace(/[^a-zA-Z0-9-]/g, '_');
            return (<linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse"
              x1={pp.x + pp.w / 2} y1={pp.y}
              x2={cp.x - cp.w / 2} y2={cp.y}>
              <stop offset="0%" stopColor={pn.color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={cn.color} stopOpacity={0.8} />
            </linearGradient>);
          })}
          <filter id="ns"><feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="hsl(222 47% 4%)" floodOpacity="0.1" /></filter>
          <filter id="ng" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="hsl(166 61% 35%)" floodOpacity="0.5" /></filter>
          <filter id="nr" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="hsl(218 82% 35%)" floodOpacity="0.3" /></filter>
        </defs>

        {conns.map(c => {
          const pp = positions[c.pid], cp = positions[c.cid];
          if (!pp || !cp) return null;
          const gid = `g-${c.pid}-${c.cid}`.replace(/[^a-zA-Z0-9-]/g, '_');
          return (<path key={`e-${c.pid}-${c.cid}`}
            d={bezierPath(pp.x + pp.w / 2, pp.y, cp.x - cp.w / 2, cp.y)}
            fill="none" stroke={`url(#${gid})`} strokeWidth={Math.max(1.2, 3 - c.d * 0.5)} strokeLinecap="round" opacity={0.75} />);
        })}

        {allNodes.map(n => {
          const p = positions[n.id]; if (!p) return null;
          const isRoot = p.depth === 0, isSel = n.id === selId;
          const fs = isRoot ? 20 : 13, rx = p.h / 2;
          const flt = isSel ? 'url(#ng)' : isRoot ? 'url(#nr)' : 'url(#ns)';
          const lines = wrapText(n.text || '', p.w, p.h, fs);
          const lh = fs * 1.35, th = lines.length * lh, fy = -(th / 2) + lh / 2;
          return (
            <g key={n.id} data-mindmap-node="true"
              onMouseDown={e => startDrag(e, n.id)}
              onTouchStart={e => startDrag(e, n.id)}
              onClick={e => e.stopPropagation()}
              style={{ cursor: 'grab' }}>
              {isSel && <rect x={p.x - p.w / 2 - 6} y={p.y - p.h / 2 - 6} width={p.w + 12} height={p.h + 12} rx={rx + 4} fill="none" stroke="hsl(166 61% 48%)" strokeWidth={1.5} strokeDasharray="5 4" className="animate-pulse" />}
              <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} rx={rx} fill={n.color || '#4338ca'} filter={flt} />
              <rect x={p.x - p.w / 2 + 1} y={p.y - p.h / 2 + 1} width={p.w - 2} height={Math.min(p.h * .45, 28)} rx={rx - 1} fill="white" opacity={isRoot ? .12 : .09} className="pointer-events-none" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill="oklch(97% 0.006 205)" fontSize={fs} fontWeight={isRoot ? '700' : '600'} fontFamily="'Inter',system-ui,sans-serif" className="pointer-events-none select-none">
                {lines.map((l, i) => <tspan key={i} x={p.x} dy={i === 0 ? fy : lh}>{l}</tspan>)}
              </text>
              {isSel && [['nw',-1,-1,'nw-resize'],['ne',1,-1,'ne-resize'],['sw',-1,1,'sw-resize'],['se',1,1,'se-resize']].map(([corner,sx,sy,cur])=>{
                const hx=p.x+sx*(p.w/2+8), hy=p.y+sy*(p.h/2+8), s=8;
                const startResize = e => {
                  e.stopPropagation(); e.preventDefault();
                  // Freeze viewBox so other nodes don't jump
                  frozenVbRef.current = { ...vb };
                  resizeDragRef.current = { id: n.id, snap: { ...posRef.current } };
                  document.body.classList.add('select-none');
                };
                return(<g key={corner} style={{cursor:cur}} onMouseDown={startResize} onTouchStart={startResize}>
                  {/* hit area */}
                  <rect x={hx-s-4} y={hy-s-4} width={(s+4)*2} height={(s+4)*2} fill="transparent"/>
                  {/* shadow */}
                  <rect x={hx-s/2} y={hy-s/2} width={s} height={s} rx={2} fill="hsl(222 47% 10%)" opacity={0.5} transform="translate(1,1)" className="pointer-events-none"/>
                  {/* white fill */}
                  <rect x={hx-s/2} y={hy-s/2} width={s} height={s} rx={2} fill="white" className="pointer-events-none"/>
                  {/* selection border */}
                  <rect x={hx-s/2} y={hy-s/2} width={s} height={s} rx={2} fill="none" stroke="hsl(166 61% 48%)" strokeWidth={1.5} className="pointer-events-none"/>
                </g>);
              })}
            </g>
          );
        })}
      </svg>

      {selId && menuMode && selNode && (() => {
        const isRoot = selNode.depth === 0;
        const ms = { left: menuPos.x, top: menuPos.y, transform: `translate(-50%,calc(-100% - 14px)) scale(${Math.sqrt(1 / zoom)})`, transformOrigin: 'bottom center' };
        const arrow = <div className="w-3 h-1.5 bg-[var(--card-bg)] border-x border-b border-[var(--border-color)]" style={{ clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />;
        if (menuMode === 'edit') return (
          <div className="absolute z-[999]" style={ms} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="w-[280px] rounded-lg shadow-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
                <p className="text-[10px] font-bold text-[var(--muted-light)] font-mono mb-3">{INTERACTIVE_MINDMAP_TEXTS.nodeEditor.title}</p>
                <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') doSave(); if (e.key === 'Escape') { setMenuMode(null); setSelId(null); } e.stopPropagation(); }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[13px] text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[hsl(166_61%_35%/0.35)]"
                  placeholder={INTERACTIVE_MINDMAP_TEXTS.nodeEditor.placeholder} />
                <div className="flex gap-2 mt-3">
                  <button onClick={doSave} className="flex-1 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-strong)] text-white rounded-xl text-[11px] font-bold transition-all">{INTERACTIVE_MINDMAP_TEXTS.nodeEditor.save}</button>
                  <button onClick={() => setMenuMode('main')} className="px-3 py-2 bg-[var(--surface)] text-[var(--muted)] rounded-xl text-[11px] font-bold transition-all">{INTERACTIVE_MINDMAP_TEXTS.nodeEditor.cancel}</button>
                </div>
              </div>{arrow}
            </div>
          </div>
        );
        if (menuMode === 'color') return (
          <div className="absolute z-[999]" style={ms} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="rounded-lg shadow-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
                <p className="text-[10px] font-bold text-[var(--muted-light)] font-mono mb-3">{INTERACTIVE_MINDMAP_TEXTS.colorPicker.title}</p>
                <div className="grid grid-cols-6 gap-2">
                  {NODE_COLORS.map(c => <button key={c.value} onClick={e => { e.stopPropagation(); doColor(c.value); }} title={c.name}
                    className="w-7 h-7 rounded-lg hover:scale-110 transition-all"
                    style={{ background: c.value, boxShadow: c.value === selNode.color ? `0 0 0 2px var(--card-bg),0 0 0 3.5px ${c.value}` : 'none' }} />)}
                </div>
                <button onClick={e => { e.stopPropagation(); setMenuMode('main'); }} className="w-full mt-3 py-1.5 text-[10px] font-bold text-[var(--muted-light)] hover:text-[var(--foreground)] transition-colors">{INTERACTIVE_MINDMAP_TEXTS.backBtn}</button>
              </div>{arrow}
            </div>
          </div>
        );
        return (
          <div className="absolute z-[999]" style={ms} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="rounded-lg shadow-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-1.5 flex items-center gap-0.5">
                <button onClick={e => { e.stopPropagation(); doEdit(); }} className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--brand-primary)] hover:bg-[hsl(166_61%_35%/0.08)] transition-all" title={INTERACTIVE_MINDMAP_TEXTS.contextMenu.editContent}>
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={e => { e.stopPropagation(); doAdd(); }} className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(158_64%_44%)] hover:bg-[hsl(158_64%_44%/0.08)] transition-all" title={INTERACTIVE_MINDMAP_TEXTS.contextMenu.addChild}>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                </button>
                <div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />
                <button onClick={e => { e.stopPropagation(); setMenuMode('color'); }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[hsl(218_82%_55%/0.08)] transition-all" title={INTERACTIVE_MINDMAP_TEXTS.contextMenu.changeColor}>
                  <span className="material-symbols-outlined text-[18px]" style={{ color: selNode.color }}>palette</span>
                </button>
                {!isRoot && <><div className="w-px h-5 bg-[var(--border-color)] mx-0.5" />
                  <button onClick={e => { e.stopPropagation(); doDel(); }} className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[hsl(4_72%_52%)] hover:bg-[hsl(343_85%_58%/0.08)] transition-all" title={INTERACTIVE_MINDMAP_TEXTS.contextMenu.deleteBranch}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button></>}
              </div>{arrow}
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default InteractiveMindmap;
