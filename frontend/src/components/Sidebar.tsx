import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useCategories } from '../hooks/useCategories';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavItem({
  to,
  icon,
  label,
  badge,
  onClick,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick?: () => void;
  collapsed?: boolean;
}): React.ReactElement {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 font-sans',
          collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
          isActive
            ? 'bg-accent/15 text-accent border border-accent/20'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface/60 border border-transparent'
        )
      }
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-accent/20 text-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge > 999 ? '999+' : badge}
        </span>
      )}
    </NavLink>
  );
}

const DashboardIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const FeedsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-.586-1.414l-4.5-4.5A2 2 0 0014.5 3H7" />
  </svg>
);

const SourcesIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const SettingsIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CategoryIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

export default function Sidebar({ onClose, collapsed, onToggleCollapse }: SidebarProps): React.ReactElement {
  const { categories } = useCategories();
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    navigate(`/category/${encodeURIComponent(category)}`);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border overflow-hidden">
      {/* Logo + collapse toggle */}
      <div className={clsx('p-4 border-b border-border flex items-center gap-2', collapsed && 'justify-center flex-col py-3')}>
        <div className={clsx('flex items-center gap-2', collapsed && 'justify-center')}>
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-display font-bold text-text-primary leading-none">FeedWatch</h1>
              <p className="text-[10px] text-text-secondary mt-0.5">RSS Intelligence</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors flex-shrink-0',
              !collapsed && 'ml-auto'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={clsx('w-4 h-4 transition-transform duration-300', collapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        <NavItem to="/" icon={DashboardIcon} label="Dashboard" onClick={onClose} collapsed={collapsed} />
        <NavItem to="/feeds" icon={FeedsIcon} label="All Feeds" onClick={onClose} collapsed={collapsed} />

        {/* Categories section - full when expanded */}
        {!collapsed && categories.length > 0 && (
          <div className="pt-3">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider px-3 mb-2">
              Categories
            </p>
            <div className="space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => handleCategoryClick(cat.category)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface/60 border border-transparent transition-all duration-150 font-sans"
                >
                  <span className="w-4 h-4 flex-shrink-0">{CategoryIcon}</span>
                  <span className="flex-1 text-left truncate">{cat.category}</span>
                  <span className="bg-surface text-text-secondary text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center border border-border">
                    {cat.count > 999 ? '999+' : cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories - icon-only when collapsed */}
        {collapsed && categories.length > 0 && (
          <div className="pt-2 space-y-0.5">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat.category}
                onClick={() => handleCategoryClick(cat.category)}
                title={cat.category}
                className="w-full flex justify-center items-center px-2 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface/60 border border-transparent transition-all duration-150"
              >
                <span className="w-4 h-4 flex-shrink-0">{CategoryIcon}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-border mt-3">
          <NavItem to="/sources" icon={SourcesIcon} label="Sources" onClick={onClose} collapsed={collapsed} />
          <NavItem to="/settings" icon={SettingsIcon} label="Settings" onClick={onClose} collapsed={collapsed} />
        </div>
      </nav>
    </div>
  );
}
