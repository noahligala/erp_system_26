import { useEffect, useState } from "react";

export const useCarousel = (items = [], intervalMs = 5500) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!items.length) return undefined;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [items.length, intervalMs]);

  const previous = () => {
    setActiveIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  return {
    activeIndex,
    activeItem: items[activeIndex],
    setActiveIndex,
    previous,
    next,
  };
};