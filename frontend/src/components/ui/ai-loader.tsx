"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export const AiLoader = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto cursor-not-allowed">
      <div className="flex items-center justify-center space-x-1 cursor-not-allowed">
        {[...Array(7)].map((_, index) => (
          <motion.div
            key={index}
            className="h-10 w-2.5 rounded-full bg-primary"
            animate={{
              scaleY: [0.5, 1.5, 0.5],
              scaleX: [1, 0.8, 1],
              translateY: ["0%", "-15%", "0%"],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.1,
            }}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
};
