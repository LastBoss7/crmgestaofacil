import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.99,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -8,
    scale: 0.99,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.25,
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Wrapper for individual page content (use inside Layout)
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.05
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list animation wrapper
export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.98 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1],
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Fade in from different directions
export function FadeIn({ 
  children, 
  direction = 'up',
  delay = 0,
  className 
}: { 
  children: ReactNode; 
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const directionVariants = {
    up: { y: 16 },
    down: { y: -16 },
    left: { x: 16 },
    right: { x: -16 },
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directionVariants[direction] 
      }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      transition={{ 
        duration: 0.35, 
        delay,
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation (for modals, cards, etc.)
export function ScaleIn({ 
  children, 
  delay = 0,
  className 
}: { 
  children: ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.2, 
        delay,
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
