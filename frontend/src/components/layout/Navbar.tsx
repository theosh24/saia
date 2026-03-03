import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import saiaLogo from '@/assets/saia-logo.png';
import WalletButton from '@/components/wallet/WalletButton';

const navItems = [
  { label: 'Registry', path: '/registry' },
  { label: 'Issue ID', path: '/issue-id' },
  { label: 'Agents', path: '/agents' },
  { label: 'Chat', path: '/chat' },
  { label: 'Reputation', path: '/reputation' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Top bar — logo left, wallet right */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <NavLink to="/" className="pointer-events-auto flex items-center gap-2.5 shrink-0 group">
            <img
              src={saiaLogo}
              alt="SAIA"
              className="w-9 h-9 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span className="font-display text-sm tracking-[0.25em] text-foreground">
              SAIA
            </span>
          </NavLink>

          <div className="pointer-events-auto flex items-center gap-3">
            <div className="hidden md:block">
              <WalletButton />
            </div>
            <button
              className="md:hidden text-muted-foreground hover:text-foreground p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating center nav pill — desktop only */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 hidden md:block pointer-events-auto">
        <nav className="glass-panel rounded-full px-1.5 py-1.5 flex items-center gap-0.5"
          style={{ boxShadow: '0 4px 30px hsl(225 30% 6% / 0.5), 0 0 1px hsl(187 100% 50% / 0.15)' }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative px-4 py-1.5 text-[13px] font-medium transition-all duration-200 rounded-full ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full border border-primary/25 pointer-events-none"
                    style={{ boxShadow: '0 0 12px hsl(187 100% 50% / 0.1)' }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-16 left-4 right-4 glass-panel-solid rounded-2xl p-4 space-y-1 animate-fade-in z-50">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 text-sm rounded-xl transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
            <div className="pt-3 border-t border-border/30">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
