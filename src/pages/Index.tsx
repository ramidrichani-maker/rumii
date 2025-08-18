import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Key, PlusCircle } from "lucide-react";

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
              <Button className="w-full" size="lg">
                Browse Properties for Sale
              </Button>
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
              <Button variant="secondary" className="w-full" size="lg">
                Find Rental Properties
              </Button>
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
              <Button variant="outline" className="w-full" size="lg">
                List Your Property
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
