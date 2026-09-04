import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CompareProperty {
  id: string;
  address: string;
  city: string;
  price: number | null;
  rental_price: number | null;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_meters: number | null;
  listing_type: string;
  images: string[] | null;
  amenities: string[] | null;
}

const formatPrice = (value: number | null | undefined) =>
  value == null ? '—' : `$${value.toLocaleString()}`;

const CompareProperties = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);
  const [properties, setProperties] = useState<CompareProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (ids.length === 0) {
        setProperties([]);
        setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from('properties')
        .select('id, address, city, price, rental_price, property_type, bedrooms, bathrooms, square_meters, listing_type, images, amenities')
        .in('id', ids);
      const ordered = ids
        .map((id) => (data || []).find((p: any) => p.id === id))
        .filter(Boolean) as CompareProperty[];
      setProperties(ordered);
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const allAmenities = Array.from(
    new Set(properties.flatMap((p) => p.amenities || []))
  ).sort();

  const rows: { label: string; render: (p: CompareProperty) => React.ReactNode }[] = [
    { label: 'Price', render: (p) => formatPrice(p.listing_type === 'rent' ? p.rental_price : p.price) },
    { label: 'Size (m²)', render: (p) => (p.square_meters ? `${p.square_meters} m²` : '—') },
    { label: 'Bedrooms', render: (p) => p.bedrooms ?? '—' },
    { label: 'Bathrooms', render: (p) => p.bathrooms ?? '—' },
    { label: 'Property type', render: (p) => p.property_type || '—' },
    { label: 'City', render: (p) => p.city || '—' },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto px-[4vw] py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-semibold text-foreground mb-6">Compare properties</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading comparison...</p>
        ) : properties.length === 0 ? (
          <p className="text-muted-foreground">No properties selected to compare.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="w-40 text-left p-3 text-sm font-medium text-muted-foreground align-bottom">Details</th>
                  {properties.map((p) => (
                    <th key={p.id} className="p-3 text-left align-bottom">
                      <Link to={`/property/${p.id}`} className="block group">
                        <div className="aspect-[4/3] w-full bg-muted rounded-lg overflow-hidden mb-2">
                          {p.images?.[0] && (
                            <img
                              src={p.images[0]}
                              alt={p.address || p.city}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <span className="text-base font-medium text-foreground">{p.city}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="p-3 text-sm font-medium text-muted-foreground">{row.label}</td>
                    {properties.map((p) => (
                      <td key={p.id} className="p-3 text-sm text-foreground">{row.render(p)}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="p-3 text-sm font-medium text-muted-foreground align-top">Amenities</td>
                  {properties.map((p) => (
                    <td key={p.id} className="p-3 text-sm text-foreground align-top">
                      {allAmenities.length === 0 ? (
                        '—'
                      ) : (
                        <ul className="space-y-1">
                          {allAmenities.map((a) => (
                            <li
                              key={a}
                              className={p.amenities?.includes(a) ? 'text-foreground' : 'text-muted-foreground line-through'}
                            >
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareProperties;
