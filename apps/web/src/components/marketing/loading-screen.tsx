// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 Mariposa Finance

"use client";

import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  if (hidden) return null;

  return (
    <div id="m-loader" className={hidden ? "hidden" : ""}>
      <div className="m-loader-cocoon">
        <div className="m-loader-wing left" />
        <div className="m-cocoon-body" />
        <div className="m-loader-wing right" />
      </div>
      <div className="m-loader-text">From cocoon to butterfly…</div>
      <div className="m-loader-bar-track">
        <div className="m-loader-bar-fill" />
      </div>
    </div>
  );
}
