import { useState, useEffect, useRef, useMemo } from 'react';

export const useContainerWidth = (threshold: number) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const showButtonText = useMemo(() => 
    containerWidth > threshold, 
    [containerWidth, threshold]
  );

  return { containerRef, showButtonText };
};