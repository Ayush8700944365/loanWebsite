import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

export const HOME_EASE = [0.22, 1, 0.36, 1];
export const HOME_DURATION = 0.6;

export function FadeUp({ children, className = "", delay = 0, as = "div" }) {
  const Component = motion[as] || motion.div;
  const reduceMotion = useReducedMotion();
  return (
    <Component
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: HOME_DURATION, delay, ease: HOME_EASE }}
    >
      {children}
    </Component>
  );
}

export function StaggerContainer({ children, className = "" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduceMotion ? {} : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: HOME_DURATION, ease: HOME_EASE }}
      layout
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ value, suffix = "", prefix = "", className = "", decimals = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.7 });
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return undefined;
    if (reduceMotion) {
      setCount(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const duration = 1300;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const scale = 10 ** decimals;
      setCount(Math.round(value * eased * scale) / scale);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, reduceMotion, value, decimals]);
  return <span ref={ref} className={className}>{prefix}{new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(count)}{suffix}</span>;
}

export function DrawLine({ className = "" }) {
  const reduceMotion = useReducedMotion();
  return (
    <svg className={className} viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d="M2 10H998" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="1000" initial={reduceMotion ? false : { strokeDashoffset: 1000 }} whileInView={reduceMotion ? undefined : { strokeDashoffset: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1.1, ease: HOME_EASE }} />
    </svg>
  );
}

export function Marquee({ children, className = "" }) {
  return <div className={`home-marquee ${className}`}><div className="home-marquee__track"><div className="home-marquee__group">{children}</div><div className="home-marquee__group" aria-hidden="true">{children}</div></div></div>;
}
