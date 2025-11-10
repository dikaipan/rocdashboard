import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink } from 'react-router-dom';
import { BarChart, Cpu, Users, TrendingUp, Info, Package, GitBranch, Tool, Menu, X, LogOut, User as UserIcon } from "react-feather";
import ThemeToggle from "../common/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar = () => {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const resizeTimeoutRef = useRef(null);
  const lastWidthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 0);

  const checkMobile = useCallback(() => {
    const width = window.innerWidth;
    setIsMobile(width < 768);
    if (width >= 768) {
      setIsMobileMenuOpen(false);
    }
  }, []);

  // Detect mobile screen size
  useEffect(() => {
    checkMobile();

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          const width = window.innerWidth;
          if (Math.abs(width - lastWidthRef.current) < 16) {
            return;
          }
          lastWidthRef.current = width;
          checkMobile();
        });
      }, 200);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [checkMobile]);

  const menuItems = [
    { id: "dashboard", path: "/dashboard", icon: BarChart, label: "Dashboard" },
    { id: "engineers", path: "/engineers", icon: Users, label: "Engineer" },
    { id: "machines", path: "/machines", icon: Cpu, label: "Mesin" },
    { id: "stockpart", path: "/stockpart", icon: Package, label: "Stock Part" },
    { id: "toolbox", path: "/toolbox", icon: Tool, label: "Toolbox" },
    { id: "structure", path: "/structure", icon: GitBranch, label: "Structure" },
    { id: "decision", path: "/decision", icon: TrendingUp, label: "Decision", badge: "BETA" },
    { id: "about", path: "/about", icon: Info, label: "About" }
  ];

  const handleToggle = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Mobile overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="mobile-header">
          <div className="mobile-logo">ROC DASH</div>
          {!isMobileMenuOpen && (
            <button 
              className="mobile-menu-toggle" 
              onClick={handleToggle}
              aria-label="Toggle mobile menu"
            >
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="mobile-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="sidebar mobile-sidebar mobile-open">
              <div className="sidebar-header">
                <div className="logo">ROC DASH</div>
                <button 
                  className="sidebar-toggle-btn" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close mobile menu"
                >
                  <X size={18} />
                </button>
              </div>
              
              <nav className="sidebar-nav" aria-label="Main navigation">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={() => {
                        if (isMobile) setIsMobileMenuOpen(false);
                      }}
                      className={({ isActive }) => `
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                            : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse" />
                          )}
                          
                          <div className="relative z-10 flex items-center gap-2.5 flex-1">
                            <Icon 
                              size={18} 
                              className={`${
                                isActive 
                                  ? 'text-white' 
                                  : isDark 
                                    ? 'text-slate-400 group-hover:text-blue-400'
                                    : 'text-gray-600 group-hover:text-blue-600'
                              } transition-colors`}
                            />
                            {!isCollapsed && (
                              <span className={`text-sm font-medium ${
                                isActive 
                                  ? 'text-white' 
                                  : isDark 
                                    ? 'text-slate-300'
                                    : 'text-gray-700'
                              }`}>
                                {item.label}
                              </span>
                            )}
                          </div>
                          
                          {/* Badge */}
                          {!isCollapsed && item.badge && (
                            <span className="relative z-10 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500 text-black">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
              
              <div className="sidebar-footer">
                <ThemeToggle className="w-full mb-2" />
                
                {/* User Info & Logout */}
                <div className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded-md border
                  ${isDark 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}>
                  <UserIcon size={14} className={isDark ? 'text-slate-400' : 'text-gray-600'} />
                  <span className={`text-xs font-medium flex-1 truncate ${
                    isDark ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {user?.name || 'User'}
                  </span>
                  <button
                    onClick={logout}
                    className={`
                      p-1 rounded transition-colors flex-shrink-0
                      ${isDark 
                        ? 'hover:bg-red-500/20 text-red-400' 
                        : 'hover:bg-red-50 text-red-600'
                      }
                    `}
                    title="Logout"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!isCollapsed ? (
          <>
            <div className="logo">ROC DASH</div>
            <div 
              className="sidebar-toggle-btn" 
              onClick={handleToggle}
              aria-label="Toggle sidebar"
              role="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }}
            >
              <X size={18} />
            </div>
          </>
        ) : (
          <>
            <div className="logo-icon">RD</div>
            <div 
              className="sidebar-toggle-btn" 
              onClick={handleToggle}
              aria-label="Toggle sidebar"
              role="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggle();
                }
              }}
            >
              <Menu size={18} />
            </div>
          </>
        )}
      </div>
      
      <nav className="sidebar-nav" aria-label="Main navigation">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
              title={item.label}
            >
              <span className="icon"><Icon size={18} strokeWidth={2}/></span>
              {!isCollapsed && (
                <span className="flex items-center gap-2">
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <ThemeToggle />
        
        {/* User Info & Logout */}
        {!isCollapsed && (
          <div className={`
            flex items-center gap-1.5 px-2 py-1.5 rounded-md border
            ${isDark 
              ? 'bg-slate-800 border-slate-700' 
              : 'bg-gray-50 border-gray-200'
            }
          `}>
            <UserIcon size={14} className={isDark ? 'text-slate-400' : 'text-gray-600'} />
            <span className={`text-xs font-medium flex-1 truncate ${
              isDark ? 'text-slate-300' : 'text-gray-700'
            }`}>
              {user?.name || 'User'}
            </span>
            <button
              onClick={logout}
              className={`
                p-1 rounded transition-colors flex-shrink-0
                ${isDark 
                  ? 'hover:bg-red-500/20 text-red-400' 
                  : 'hover:bg-red-50 text-red-600'
                }
              `}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
        
        {/* Collapsed: Only logout button */}
        {isCollapsed && (
          <button
            onClick={logout}
            className={`
              w-full p-1.5 rounded-md transition-colors flex-shrink-0
              ${isDark 
                ? 'hover:bg-red-500/20 text-red-400' 
                : 'hover:bg-red-50 text-red-600'
              }
            `}
            title="Logout"
          >
            <LogOut size={16} className="mx-auto" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);