import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle, Facebook, Youtube } from 'lucide-react';
import rumiLogo from '@/assets/rumi-logo.png';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CustomerSupportChat } from './CustomerSupportChat';

const sections: { title: string; items?: { label: string; to?: string }[] }[] = [
  {
    title: '\n\nPROPERTIES',
    items: [
      { label: 'All Properties', to: '/purchase' },
      { label: 'Our Collections' },
      { label: 'New Properties' },
      { label: 'Vacation Rentals' },
    ],
  },
  {
    title: '\n\nOUR WORLD',
    items: [
      { label: 'Born in Beirut' },
      { label: 'Who We Are' },
      { label: 'Stay Connected' },
      { label: 'Our Projects' },
    ],
  },
  {
    title: '\n\nSERVICES',
    items: [
      { label: 'Maintenance Services' },
      { label: 'Insure Property' },
      { label: 'Int/Ext Architecture' },
      { label: 'Contact us' },
    ],
  },
  {
    title: '\n\nCOMPANY',
    items: [
      { label: 'Careers' },
      { label: 'Foundations' },
      { label: 'Collaborations' },
      { label: 'Sustainability' },
    ],
  },
];

const legalLinks = [
  { label: 'Terms of Use', to: '/terms-of-service' },
  { label: 'Privacy Notice', to: '#' },
  { label: 'Cookie Policy', to: '#' },
  { label: 'Masterclasses Terms of Sale', to: '#' },
];

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.4c-1.2.1-2.4-.2-3.5-.8v5.9c0 3.4-2.5 5.6-5.6 5.6-3 0-5.4-2.3-5.4-5.3 0-3.1 2.6-5.4 5.7-5.1v2.5c-.4-.1-.8-.2-1.2-.2-1.5 0-2.7 1.2-2.7 2.7 0 1.5 1.2 2.6 2.7 2.6 1.6 0 2.8-1.2 2.8-2.8V3h2.5z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.2 2.3h3.3l-7.2 8.3 8.5 11.2h-6.7l-5.3-6.9-6 6.9H1.5l7.7-8.8L1.1 2.3h6.8l4.8 6.3 5.5-6.3zm-1.2 17.9h1.8L7.1 4.2H5.2l11.8 16z" />
  </svg>
);

export const Footer = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <footer className="bg-footer text-footer-foreground mt-auto">
      <div className="container mx-auto px-4 pt-12">
        <div className="flex flex-col md:flex-row md:justify-center md:items-start gap-10 md:gap-32 pb-10">
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-title text-footer-foreground tracking-[0.18em] uppercase leading-none text-center">
              <span className="block">Maison</span>
              <span className="block">Atelier</span>
            </h2>
            <span className="block text-base font-title text-footer-foreground/70 mt-1 text-center">rumi</span>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-lg font-title text-footer-foreground/70 tracking-[0.18em] uppercase leading-none mt-2">Foundations</h2>
            <span className="block text-2xl font-title text-footer-foreground mt-1">rumi</span>
          </div>
        </div>
      </div>
      <div className="w-full border-t border-[hsl(30_18%_78%)]" />
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:ml-auto md:max-w-[60%] lg:max-w-[48%] mt-20">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <h3 className="text-xs font-[Arial,sans-serif] font-light tracking-[0.18em] text-footer-foreground uppercase mb-1 whitespace-pre-wrap">
                {section.title}
              </h3>
              {section.items?.map((item) => (
                item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="text-sm font-[Arial,sans-serif] font-light text-footer-foreground/70 leading-6 hover:text-footer-foreground transition-colors cursor-pointer"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className="text-sm font-[Arial,sans-serif] font-light text-footer-foreground/70 leading-6"
                  >
                    {item.label}
                  </span>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar: brand, social icons, legal links, copyright */}
        <div className="mt-[5.1rem] flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Brand + social icons */}
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-lg font-title text-footer-foreground leading-none">{"\n"}</span>
              </Link>

              <div className="flex items-center gap-4">
                <span
                  aria-label="Instagram"
                  className="text-footer-foreground/70"
                >
                  <Instagram className="w-5 h-5" />
                </span>
                <span
                  aria-label="Facebook"
                  className="text-footer-foreground/70"
                >
                  <Facebook className="w-5 h-5" />
                </span>
                <span
                  aria-label="Youtube"
                  className="text-footer-foreground/70"
                >
                  <Youtube className="w-5 h-5" />
                </span>
                <span
                  aria-label="TikTok"
                  className="text-footer-foreground/70"
                >
                  <TikTokIcon className="w-5 h-5" />
                </span>
                <span
                  aria-label="LinkedIn"
                  className="text-footer-foreground/70"
                >
                  <Linkedin className="w-5 h-5" />
                </span>
                <span
                  aria-label="Customer support chat"
                  className="text-footer-foreground/70"
                >
                  <MessageCircle className="w-5 h-5" />
                </span>
                <span
                  aria-label="X"
                  className="text-footer-foreground/70"
                >
                  <XIcon className="w-5 h-5" />
                </span>
              </div>
            </div>

            {/* Legal links */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                link.to && link.to !== '#' ? (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="text-xs font-[Arial,sans-serif] font-light text-footer-foreground/70 hover:text-footer-foreground transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span
                    key={link.label}
                    className="text-xs font-[Arial,sans-serif] font-light text-footer-foreground/70 cursor-pointer hover:text-footer-foreground transition-colors"
                  >
                    {link.label}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Copyright bottom-left */}
          <p className="text-xs font-[Arial,sans-serif] font-light text-footer-foreground/70 mb-8">
            © {new Date().getFullYear()} rumi. all rights reserved
          </p>
        </div>
      </div>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Customer Support</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <CustomerSupportChat />
          </div>
        </SheetContent>
      </Sheet>
    </footer>
  );
};
