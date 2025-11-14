"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SearchIncidentById() {
  const [value, setValue] = React.useState("");
  const router = useRouter();

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const id = value.trim();
      if (id) router.push(`/dashboard/incidents/${encodeURIComponent(id)}`);
    }
  };

  return (
    <input
      type="text"
      placeholder="Go to ID…"
      aria-label="Search by incident ID"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      style={{
        width: 130,
        padding: '4px 8px',
        borderRadius: 6,
        border: '1px solid #e5e7eb',
        background: 'white',
        color: '#111827',
        fontSize: 12,
      }}
    />
  );
}
