import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, Home, DollarSign, MapPin, Eye } from "lucide-react";
import PropertyDetailModal from "@/components/PropertyDetailModal";

interface Property {
  id: string;
  address: string;
  city: string;
  municipality?: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: 'rent' | 'sale';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  images: string[];
  amenities: string[];
  year_built?: number;
  last_renovated?: number;
  user_id: string;
}

interface UserAccount {
  user_id: string;
  full_name: string;
  phone_number: string;
  role: string;
  created_at: string;
}

const AccountPropertiesView: React.FC = () => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [propertiesByUser, setPropertiesByUser] = useState<Record<string, Property[]>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadAccountsWithProperties();
  }, []);

  const loadAccountsWithProperties = async () => {
    setIsLoading(true);
    try {
      // Fetch all user accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      setAccounts(accountsData || []);

      // Fetch all properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // Group properties by user_id
      const grouped = (propertiesData || []).reduce((acc, property) => {
        if (!acc[property.user_id]) {
          acc[property.user_id] = [];
        }
        acc[property.user_id].push(property);
        return acc;
      }, {} as Record<string, Property[]>);

      setPropertiesByUser(grouped);
    } catch (error) {
      console.error('Error loading accounts and properties:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts and properties",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccount = (userId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: { variant: "default" as const, text: "Approved" },
      pending: { variant: "secondary" as const, text: "Pending" },
      rejected: { variant: "destructive" as const, text: "Rejected" }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Accounts & Properties</CardTitle>
          <p className="text-sm text-muted-foreground">
            {accounts.length} total accounts • {Object.values(propertiesByUser).flat().length} total properties
          </p>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No accounts found</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const properties = propertiesByUser[account.user_id] || [];
                const isExpanded = expandedAccounts.has(account.user_id);

                return (
                  <div key={account.user_id} className="border rounded-lg overflow-hidden">
                    {/* Account Header */}
                    <button
                      onClick={() => toggleAccount(account.user_id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <h3 className="font-semibold">{account.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {account.phone_number} • <Badge variant="outline">{account.role}</Badge>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {properties.length} {properties.length === 1 ? 'property' : 'properties'}
                        </Badge>
                      </div>
                    </button>

                    {/* Property Listings */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20">
                        {properties.length === 0 ? (
                          <p className="text-muted-foreground text-center py-6 text-sm">
                            No properties listed
                          </p>
                        ) : (
                          <div className="divide-y">
                            {properties.map((property) => (
                              <div key={property.id} className="p-4 hover:bg-accent/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-medium">{property.address}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          <MapPin className="w-3 h-3 inline mr-1" />
                                          {property.city}
                                          {property.municipality && `, ${property.municipality}`}
                                        </p>
                                      </div>
                                      {getStatusBadge(property.status)}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Home className="w-3 h-3" />
                                        {property.property_type}
                                      </span>
                                      <span>{property.square_meters}m²</span>
                                      <span>{property.bedrooms} bed</span>
                                      <span>{property.bathrooms} bath</span>
                                      <span className="flex items-center gap-1 font-medium text-foreground">
                                        <DollarSign className="w-3 h-3" />
                                        {property.price?.toLocaleString()}
                                        {property.listing_type === 'rent' && '/mo'}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {property.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                                      </Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                      Listed on {new Date(property.created_at).toLocaleDateString()}
                                    </p>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewProperty(property)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onDelete={loadAccountsWithProperties}
        isAdmin={true}
      />
    </>
  );
};

export default AccountPropertiesView;
