import { Link } from 'react-router-dom';
import rumiLogo from '@/assets/rumi-logo.png';

const sections: { title: string; items?: string[] }[] = [
  {
    title: 'PROPERTIES',
    items: ['All Properties', 'Our Collections', 'New Listings', 'Find a Vacation Rental'],
  },
  { title: 'OUR WORLD', items: ['Born in Beirut', 'Who We Are', 'Stay Connected', 'Our Projects'] },
  {
    title: 'SERVICES',
    items: ['Maintenance Services', 'Insure Property', 'Int/Ext Architecture', 'Contact us'],
  },
  { title: 'COMPANY', items: ['Careers', 'Foundations', 'Collaborations', 'Sustainability'] },
];

export const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              <h3 className="text-xs font-[Arial,sans-serif] font-light tracking-[0.18em] text-footer-foreground uppercase">
                {section.title}
              </h3>
              {section.items?.map((item) => (
                <span
                  key={item}
                  className="text-sm font-[Arial,sans-serif] font-light text-footer-foreground/70"
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-footer-foreground/20 flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center space-x-2">
            <img src={rumiLogo} alt="Rumi" className="w-[36px] h-[36px] object-contain" />
            <span className="text-lg font-title text-footer-foreground leading-none">rumi</span>
          </Link>
          <p className="text-xs font-[Arial,sans-serif] font-light text-footer-foreground/70">
            © {new Date().getFullYear()} Rumi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
