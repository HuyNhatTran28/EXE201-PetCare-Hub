import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  /** Delay before animation starts (seconds) */
  delay?: number
  /** Direction the element slides from */
  direction?: 'up' | 'left' | 'right' | 'none'
  /** Distance in pixels to travel */
  distance?: number
  /** Animation duration (seconds) */
  duration?: number
  /** Only animate once (default: true) */
  once?: boolean
  /** IntersectionObserver threshold (0-1) */
  threshold?: number
  /** Additional className */
  className?: string
  /** Inline styles */
  style?: React.CSSProperties
}

/**
 * COROS/Apple-style scroll-triggered reveal component.
 * Wraps children and animates them into view when scrolled into viewport.
 * Uses only opacity + translate for a clean, premium feel.
 */
export const ScrollReveal = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 40,
  duration = 0.8,
  once = true,
  threshold = 0.15,
  className = '',
  style,
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once,
    amount: threshold,
  })

  const getInitial = () => {
    switch (direction) {
      case 'left':
        return { opacity: 0, x: -distance }
      case 'right':
        return { opacity: 0, x: distance }
      case 'none':
        return { opacity: 0 }
      case 'up':
      default:
        return { opacity: 0, y: distance }
    }
  }

  const getAnimate = () => {
    switch (direction) {
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 }
      case 'none':
        return { opacity: 1 }
      case 'up':
      default:
        return { opacity: 1, y: 0 }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={getInitial()}
      animate={isInView ? getAnimate() : getInitial()}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
