'use client';

import { useEffect, useState } from 'react';

const THEMES = ['theme-teal','theme-sunset','theme-indigo','theme-mint'] as const;
type ThemeName = typeof THEMES[number];

function applyTheme(name: ThemeName){
  const root = document.documentElement;
  THEMES.forEach(t => root.classList.remove(t));
  root.classList.add(name);
  localStorage.setItem('site-theme', name);
}

export default function ThemePaletteToggle(){
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeName>('theme-teal');

  useEffect(() => {
    const saved = (localStorage.getItem('site-theme') as ThemeName) || 'theme-teal';
    setCurrent(saved);
    applyTheme(saved);
  }, []);

  const handlePick = (name: ThemeName) => {
    setCurrent(name);
    applyTheme(name);
    setOpen(false);
  };

  const swatch = (bg: string) => ({ width: 14, height: 14, borderRadius: 3, background: bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' } as const);

  return (
    <div style={{ position:'relative' }}>
      <button className="btn btn--secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)} title="Theme palettes">
        Theme
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" style={{ position:'absolute', right:0, top:'110%', background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:8, padding:8, boxShadow:'var(--shadow-medium)', display:'grid', gap:6, minWidth: 200, zIndex: 50 }}>
          <div role="menuitem" onClick={() => handlePick('theme-teal')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:6, borderRadius:6, background: current==='theme-teal' ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'transparent' }}>
            <span style={swatch('#0ea5a4')} /> Teal Breeze
          </div>
          <div role="menuitem" onClick={() => handlePick('theme-sunset')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:6, borderRadius:6, background: current==='theme-sunset' ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'transparent' }}>
            <span style={swatch('#ff6b6b')} /> Sunset Coral
          </div>
          <div role="menuitem" onClick={() => handlePick('theme-indigo')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:6, borderRadius:6, background: current==='theme-indigo' ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'transparent' }}>
            <span style={swatch('#5b21b6')} /> Vivid Indigo
          </div>
          <div role="menuitem" onClick={() => handlePick('theme-mint')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:6, borderRadius:6, background: current==='theme-mint' ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'transparent' }}>
            <span style={swatch('#16a34a')} /> Mint Lime
          </div>
        </div>
      )}
    </div>
  );
}
