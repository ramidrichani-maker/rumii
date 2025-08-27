import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calculator, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyMap from '@/components/PropertyMap';

interface CalculationResults {
  monthlyRental: number;
  annualRental: number;
  grossYield: number;
  netYield: number;
  monthlyCashflow: number;
  annualCashflow: number;
}

const InvestmentAnalytics = () => {
  const [formData, setFormData] = useState({
    location: '',
    city: '',
    propertyType: '',
    squareMeters: '',
    yearBuilt: '',
    lastRenovated: '',
    purchasePrice: '',
    downPayment: '',
    loanAmount: '',
    interestRate: '',
    loanTerm: '',
    monthlyExpenses: ''
  });
  
  const [coordinates, setCoordinates] = useState({ lat: 35.9078, lng: 14.4109 });
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setCoordinates({ lat, lng });
    if (address) {
      // Extract location from address for better calculations
      const addressParts = address.split(',');
      const location = addressParts[0]?.trim().toLowerCase();
      if (location && !formData.location) {
        setFormData(prev => ({ ...prev, location: 'suburban' })); // Default to suburban
      }
    }
  };

  const calculateInvestment = () => {
    setIsCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const squareMeters = parseFloat(formData.squareMeters) || 0;
      const purchasePrice = parseFloat(formData.purchasePrice) || 0;
      const loanAmount = parseFloat(formData.loanAmount) || 0;
      const interestRate = parseFloat(formData.interestRate) || 0;
      const loanTerm = parseFloat(formData.loanTerm) || 30;
      const monthlyExpenses = parseFloat(formData.monthlyExpenses) || 0;
      const yearBuilt = parseInt(formData.yearBuilt) || new Date().getFullYear();
      const lastRenovated = parseInt(formData.lastRenovated) || yearBuilt;
      
      // Base rental calculation (this would typically use real market data)
      let baseRentalPerSqm = 15; // Base $15 per sqm
      
      // District multipliers
      const locationMultipliers: { [key: string]: number } = {
        'beirut': 1.5,
        'jbeil': 1.2,
        'batroun': 1.1,
        'faqra': 1.3,
        'faraya': 1.3,
        'broumana': 1.2
      };
      
      // Property type multipliers
      const propertyMultipliers: { [key: string]: number } = {
        'apartment': 1.0,
        'house': 1.2,
        'studio': 0.9,
        'villa': 1.4,
        'penthouse': 1.6
      };
      
      // Age and renovation adjustments
      const currentYear = new Date().getFullYear();
      const ageAdjustment = Math.max(0.7, 1 - (currentYear - yearBuilt) * 0.005);
      const renovationBonus = lastRenovated > yearBuilt ? 1.1 : 1.0;
      
      const locationMultiplier = locationMultipliers[formData.location.toLowerCase()] || 1.0;
      const propertyMultiplier = propertyMultipliers[formData.propertyType.toLowerCase()] || 1.0;
      
      const monthlyRental = squareMeters * baseRentalPerSqm * locationMultiplier * propertyMultiplier * ageAdjustment * renovationBonus;
      const annualRental = monthlyRental * 12;
      
      // Mortgage calculation
      const monthlyInterestRate = interestRate / 100 / 12;
      const numberOfPayments = loanTerm * 12;
      let monthlyMortgage = 0;
      
      if (loanAmount > 0 && monthlyInterestRate > 0) {
        monthlyMortgage = loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
                         (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
      }
      
      const monthlyCashflow = monthlyRental - monthlyMortgage - monthlyExpenses;
      const annualCashflow = monthlyCashflow * 12;
      
      const grossYield = purchasePrice > 0 ? (annualRental / purchasePrice) * 100 : 0;
      const netYield = purchasePrice > 0 ? (annualCashflow / purchasePrice) * 100 : 0;
      
      setResults({
        monthlyRental: Math.round(monthlyRental),
        annualRental: Math.round(annualRental),
        grossYield: Math.round(grossYield * 100) / 100,
        netYield: Math.round(netYield * 100) / 100,
        monthlyCashflow: Math.round(monthlyCashflow),
        annualCashflow: Math.round(annualCashflow)
      });
      
      setIsCalculating(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Investment Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Estimate your property's rental yield and investment potential
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Property Details
              </CardTitle>
              <CardDescription>
                Enter your property information to calculate investment returns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location Map */}
              <div className="space-y-2">
                <Label>Property Location</Label>
                <PropertyMap
                  latitude={coordinates.lat}
                  longitude={coordinates.lng}
                  onLocationSelect={handleLocationSelect}
                  height="200px"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">District</Label>
                  <Select onValueChange={(value) => handleSelectChange('location', value)} value={formData.location}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beirut">Beirut</SelectItem>
                      <SelectItem value="jbeil">Jbeil</SelectItem>
                      <SelectItem value="batroun">Batroun</SelectItem>
                      <SelectItem value="faqra">Faqra</SelectItem>
                      <SelectItem value="faraya">Faraya</SelectItem>
                      <SelectItem value="broumana">Broumana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select onValueChange={(value) => handleSelectChange('city', value)} value={formData.city}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beirut_city">Beirut City</SelectItem>
                      <SelectItem value="tripoli">Tripoli</SelectItem>
                      <SelectItem value="sidon">Sidon</SelectItem>
                      <SelectItem value="tyre">Tyre</SelectItem>
                      <SelectItem value="zahle">Zahle</SelectItem>
                      <SelectItem value="jounieh">Jounieh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select onValueChange={(value) => handleSelectChange('propertyType', value)} value={formData.propertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="squareMeters">Area (sq meters)</Label>
                  <Input
                    id="squareMeters"
                    name="squareMeters"
                    type="number"
                    placeholder="120"
                    value={formData.squareMeters}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    placeholder="300000"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    name="yearBuilt"
                    type="number"
                    placeholder="2010"
                    value={formData.yearBuilt}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastRenovated">Last Renovated</Label>
                  <Input
                    id="lastRenovated"
                    name="lastRenovated"
                    type="number"
                    placeholder="2020"
                    value={formData.lastRenovated}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Financing Details (Optional)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanAmount">Loan Amount ($)</Label>
                    <Input
                      id="loanAmount"
                      name="loanAmount"
                      type="number"
                      placeholder="240000"
                      value={formData.loanAmount}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <Input
                      id="interestRate"
                      name="interestRate"
                      type="number"
                      step="0.1"
                      placeholder="3.5"
                      value={formData.interestRate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="loanTerm">Loan Term (years)</Label>
                    <Input
                      id="loanTerm"
                      name="loanTerm"
                      type="number"
                      placeholder="30"
                      value={formData.loanTerm}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
                    <Input
                      id="monthlyExpenses"
                      name="monthlyExpenses"
                      type="number"
                      placeholder="500"
                      value={formData.monthlyExpenses}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={calculateInvestment}
                className="w-full"
                size="lg"
                disabled={isCalculating || !formData.location || !formData.propertyType || !formData.squareMeters}
              >
                {isCalculating ? "Calculating..." : "Calculate Investment Returns"}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {results ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Rental Income Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">${results.monthlyRental}</div>
                        <div className="text-sm text-muted-foreground">Monthly Rental</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">${results.annualRental}</div>
                        <div className="text-sm text-muted-foreground">Annual Rental</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="w-5 h-5" />
                      Investment Yields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{results.grossYield}%</div>
                        <div className="text-sm text-muted-foreground">Gross Yield</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{results.netYield}%</div>
                        <div className="text-sm text-muted-foreground">Net Yield</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Cash Flow Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${results.monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${results.monthlyCashflow}
                        </div>
                        <div className="text-sm text-muted-foreground">Monthly Cash Flow</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${results.annualCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${results.annualCashflow}
                        </div>
                        <div className="text-sm text-muted-foreground">Annual Cash Flow</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Important Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• These are estimates based on general market data</li>
                      <li>• Actual rental income may vary based on market conditions</li>
                      <li>• Consider additional costs like property management, repairs, and vacancy</li>
                      <li>• Consult with a real estate professional for detailed analysis</li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Calculate</h3>
                  <p className="text-muted-foreground text-center">
                    Fill in the property details on the left to see your investment analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentAnalytics;