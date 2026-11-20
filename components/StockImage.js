"use client";

import { useState } from "react";

export default function StockImage({ src, alt, className = "", priority = false }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`img-fallback ${className}`} role="img" aria-label={alt} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  );
}
