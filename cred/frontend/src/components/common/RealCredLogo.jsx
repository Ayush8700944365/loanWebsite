import React from 'react';
import { Link } from 'react-router-dom';

export const RealCredLogo = ({
  variant = 'default',
  theme = 'dark', // 'dark' text for light bg, 'light' text for dark bg
  className = '',
  to = '/'
}) => {
  const isLight = theme === 'light';

  const logoMark = (
    <img
      src="/logo/realcred-mark.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
      className="h-10 w-10 flex-shrink-0 rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105"
    />
  );

  const logoText = (
    <div className="flex flex-col">
      <div className="flex items-center leading-none">
        <span className={`text-2xl font-black tracking-tight ${isLight ? 'text-white' : 'text-[#18181B]'}`}>
          Real<span className="text-[#DC2626]">Cred</span>
        </span>
      </div>
    </div>
  );

  const content = (
    <>
      {logoMark}
      {variant !== 'compact' && logoText}
    </>
  );

  if (!to) {
    return (
      <div className={`flex min-w-0 items-center space-x-2.5 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className={`flex min-w-0 items-center space-x-2.5 group ${className}`}>
      {content}
    </Link>
  );
};
