import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Key, PlusCircle, Bed, Bath, Square } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-foreground">Find Your Perfect Property</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're looking to buy, rent, or list a property, we've got you covered.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Home className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Purchase</CardTitle>
              <CardDescription>
                Find and buy your dream home with our extensive property listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/purchase">
                <Button className="w-full" size="lg">
                  Browse Properties for Sale
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-secondary/80 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl">Rent</CardTitle>
              <CardDescription>
                Discover rental properties that match your lifestyle and budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/rent">
                <Button variant="secondary" className="w-full" size="lg">
                  Find Rental Properties
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
                <PlusCircle className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">List Property</CardTitle>
              <CardDescription>
                List your property and connect with potential buyers or tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/list-property">
                <Button variant="outline" className="w-full" size="lg">
                  List Your Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        
        {/* Popular Listings Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Popular Listings</h2>
            <p className="text-lg text-muted-foreground">
              Discover the most sought-after properties in your area
            </p>
          </div>
          
          {/* Rental Properties Row */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold mb-6 text-foreground">Featured Rentals</h3>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">For Rent</Badge>
                    <span className="text-2xl font-bold text-primary">$2,500/mo</span>
                  </div>
                  <CardTitle className="text-lg">Modern Downtown Apartment</CardTitle>
                  <CardDescription>123 Main St, Downtown</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>2 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>2 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>1,200 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">For Rent</Badge>
                    <span className="text-2xl font-bold text-primary">$3,200/mo</span>
                  </div>
                  <CardTitle className="text-lg">Luxury Condo with View</CardTitle>
                  <CardDescription>456 Oak Ave, Midtown</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>3 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>2 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>1,800 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">For Rent</Badge>
                    <span className="text-2xl font-bold text-primary">$1,800/mo</span>
                  </div>
                  <CardTitle className="text-lg">Cozy Studio Loft</CardTitle>
                  <CardDescription>789 Elm St, Arts District</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>1 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>1 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>850 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary">For Rent</Badge>
                    <span className="text-2xl font-bold text-primary">$2,900/mo</span>
                  </div>
                  <CardTitle className="text-lg">Garden Apartment</CardTitle>
                  <CardDescription>321 Pine Rd, Suburban</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>2 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>2 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>1,400 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Properties for Sale Row */}
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-foreground">Properties for Sale</h3>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge>For Sale</Badge>
                    <span className="text-2xl font-bold text-primary">$450,000</span>
                  </div>
                  <CardTitle className="text-lg">Victorian Family Home</CardTitle>
                  <CardDescription>567 Maple Dr, Historic District</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>4 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>3 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>2,500 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge>For Sale</Badge>
                    <span className="text-2xl font-bold text-primary">$275,000</span>
                  </div>
                  <CardTitle className="text-lg">Starter Home with Yard</CardTitle>
                  <CardDescription>890 Cedar Ln, Northside</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>3 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>2 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>1,600 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge>For Sale</Badge>
                    <span className="text-2xl font-bold text-primary">$750,000</span>
                  </div>
                  <CardTitle className="text-lg">Executive Estate</CardTitle>
                  <CardDescription>234 Summit Way, Hillside</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>5 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>4 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>3,200 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-300">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge>For Sale</Badge>
                    <span className="text-2xl font-bold text-primary">$325,000</span>
                  </div>
                  <CardTitle className="text-lg">Modern Townhouse</CardTitle>
                  <CardDescription>678 River View, Waterfront</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      <span>3 bed</span>
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      <span>2.5 bath</span>
                    </div>
                    <div className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      <span>1,900 sqft</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
