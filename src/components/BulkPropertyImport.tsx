import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, X, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ParsedProperty {
  row: number;
  municipality?: string;
  city: string;
  address: string;
  property_type: string;
  square_meters: number;
  bedrooms: number;
  bathrooms: number;
  listing_type: "rent" | "sale" | "both";
  price: number;
  price_negotiable?: boolean;
  year_built?: number;
  last_renovated?: number;
  amenities?: string[];
  agency_name?: string;
  agent_email?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  valid: boolean;
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

const PROPERTY_TYPES = ["apartment", "villa", "beach house", "chalet", "duplex", "triplex", "penthouse", "commercial", "farm house", "building", "venue", "studio", "rooftop", "land"];
const PROPERTY_STATUSES = ["pending", "approved", "rejected"] as const;

export const BulkPropertyImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedProperty[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ user_id: string; email: string; full_name: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [exportListingTypes, setExportListingTypes] = useState<string[]>(['rent', 'sale']);
  const [exportPropertyTypes, setExportPropertyTypes] = useState<string[]>([...PROPERTY_TYPES]);
  const [exportStatuses, setExportStatuses] = useState<string[]>([...PROPERTY_STATUSES]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const toggleExportListingType = (type: string) => {
    setExportListingTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleExportPropertyType = (type: string) => {
    setExportPropertyTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const selectAllPropertyTypes = () => setExportPropertyTypes([...PROPERTY_TYPES]);
  const clearAllPropertyTypes = () => setExportPropertyTypes([]);

  const toggleExportStatus = (status: string) => {
    setExportStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const loadAgencies = async () => {
    const { data } = await supabase.from('agencies').select('id, name');
    setAgencies(data || []);
  };

  const loadAgents = async () => {
    // Get agents/admins from profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('role', ['agent', 'admin']);
    
    if (!profiles) {
      setAgents([]);
      return;
    }

    // Get emails from auth - we need to fetch user emails separately
    // Since we can't directly access auth.users, we'll match by user_id
    // For now, store what we have and match by checking the email in the CSV
    const agentsWithInfo = profiles.map(p => ({
      user_id: p.user_id,
      email: '', // Will be matched during import
      full_name: p.full_name
    }));
    
    setAgents(agentsWithInfo);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n');
    const result: string[][] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        const row: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        row.push(current.trim());
        result.push(row);
      }
    }
    
    return result;
  };

  const validateProperty = (row: string[], rowIndex: number, headers: string[]): ParsedProperty => {
    const errors: string[] = [];
    const getValue = (header: string): string => {
      const index = headers.findIndex(h => h.toLowerCase().replace(/[_\s]/g, '') === header.toLowerCase().replace(/[_\s]/g, ''));
      return index >= 0 ? (row[index] || '').trim() : '';
    };

    const city = getValue('city');
    const address = getValue('address');
    const propertyType = getValue('propertytype') || getValue('property_type');
    const squareMeters = getValue('squaremeters') || getValue('square_meters') || getValue('size');
    const bedrooms = getValue('bedrooms') || getValue('beds');
    const bathrooms = getValue('bathrooms') || getValue('baths');
    const listingType = getValue('listingtype') || getValue('listing_type') || getValue('type');
    const price = getValue('price');

    if (!city) errors.push('City is required');
    if (!address) errors.push('Address is required');
    if (!propertyType) errors.push('Property type is required');
    if (!squareMeters || isNaN(Number(squareMeters))) errors.push('Valid square meters required');
    if (!bedrooms || isNaN(Number(bedrooms))) errors.push('Valid bedrooms required');
    if (!bathrooms || isNaN(Number(bathrooms))) errors.push('Valid bathrooms required');
    if (!listingType || !['rent', 'sale'].includes(listingType.toLowerCase())) errors.push('Listing type must be "rent" or "sale"');
    if (!price || isNaN(Number(price))) errors.push('Valid price required');

    const normalizedType = propertyType.toLowerCase();
    if (propertyType && !PROPERTY_TYPES.includes(normalizedType)) {
      errors.push(`Invalid property type: ${propertyType}`);
    }

    const amenitiesStr = getValue('amenities');
    const amenities = amenitiesStr ? amenitiesStr.split(';').map(a => a.trim()).filter(Boolean) : [];
    
    const agentEmail = getValue('agentemail') || getValue('agent_email') || getValue('agent');
    
    // Parse image URLs (semicolon-separated)
    const imagesStr = getValue('images') || getValue('image_urls') || getValue('imageurls');
    const images = imagesStr ? imagesStr.split(';').map(url => url.trim()).filter(Boolean) : [];

    return {
      row: rowIndex + 2,
      municipality: getValue('municipality') || getValue('district') || undefined,
      city,
      address,
      property_type: normalizedType,
      square_meters: Number(squareMeters) || 0,
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      listing_type: (['rent', 'sale', 'both'].includes(listingType?.toLowerCase() || '') ? listingType?.toLowerCase() : 'sale') as "rent" | "sale" | "both",
      price: Number(price) || 0,
      price_negotiable: ['true', 'yes', '1'].includes(getValue('pricenegotiable')?.toLowerCase() || getValue('price_negotiable')?.toLowerCase() || ''),
      year_built: getValue('yearbuilt') || getValue('year_built') ? Number(getValue('yearbuilt') || getValue('year_built')) : undefined,
      last_renovated: getValue('lastrenovated') || getValue('last_renovated') ? Number(getValue('lastrenovated') || getValue('last_renovated')) : undefined,
      amenities,
      agency_name: getValue('agency') || getValue('agencyname') || getValue('agency_name') || undefined,
      agent_email: agentEmail || undefined,
      images: images.length > 0 ? images : undefined,
      latitude: getValue('latitude') || getValue('lat') ? Number(getValue('latitude') || getValue('lat')) : undefined,
      longitude: getValue('longitude') || getValue('lng') || getValue('lon') ? Number(getValue('longitude') || getValue('lng') || getValue('lon')) : undefined,
      valid: errors.length === 0,
      errors
    };
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setParsedData([]);
    setImportResult(null);

    await loadAgencies();
    await loadAgents();

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        throw new Error('CSV must have a header row and at least one data row');
      }

      const headers = rows[0].map(h => h.toLowerCase().replace(/[_\s]/g, ''));
      const dataRows = rows.slice(1);
      
      const parsed = dataRows.map((row, index) => validateProperty(row, index, headers));
      setParsedData(parsed);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to import properties",
        variant: "destructive"
      });
      return;
    }

    const validProperties = parsedData.filter(p => p.valid);
    if (validProperties.length === 0) {
      toast({
        title: "No Valid Properties",
        description: "Please fix validation errors before importing",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < validProperties.length; i++) {
      const prop = validProperties[i];
      
      try {
        let agencyId: string | null = null;
        if (prop.agency_name) {
          const agency = agencies.find(a => 
            a.name.toLowerCase() === prop.agency_name?.toLowerCase()
          );
          if (agency) {
            agencyId = agency.id;
          }
        }

        const { data: insertedProperty, error } = await supabase.from('properties').insert({
          user_id: user.id,
          agency_id: agencyId,
          municipality: prop.municipality || null,
          city: prop.city,
          address: prop.address,
          property_type: prop.property_type as any,
          square_meters: prop.square_meters,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          listing_type: prop.listing_type as any,
          price: prop.price,
          price_negotiable: prop.price_negotiable || false,
          year_built: prop.year_built || null,
          last_renovated: prop.last_renovated || null,
          amenities: prop.amenities || [],
          latitude: prop.latitude || null,
          longitude: prop.longitude || null,
          status: 'approved',
          images: prop.images || []
        }).select('id').single();

        if (error) throw error;

        // Assign agent if agent_email is provided
        if (prop.agent_email && insertedProperty) {
          // Find the agent by email using our database function
          const { data: agentData } = await supabase
            .rpc('get_agent_by_email', { _email: prop.agent_email });
          
          if (agentData && agentData.length > 0 && agentData[0].user_id) {
            await supabase.from('property_agents').insert({
              property_id: insertedProperty.id,
              agent_id: agentData[0].user_id
            });
          }
        }

        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: prop.row,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      setImportProgress(Math.round(((i + 1) / validProperties.length) * 100));
    }

    setImportResult(result);
    setIsImporting(false);

    if (result.success > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} properties${result.failed > 0 ? `, ${result.failed} failed` : ''}`
      });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'city', 'address', 'property_type', 'square_meters', 'bedrooms', 'bathrooms',
      'listing_type', 'price', 'price_negotiable', 'municipality', 'year_built',
      'last_renovated', 'amenities', 'agency_name', 'agent_email', 'images', 'latitude', 'longitude'
    ];
    const exampleRow = [
      'Beirut', '123 Main Street, Downtown', 'apartment', '150', '3', '2',
      'sale', '250000', 'true', 'Beirut', '2015',
      '2022', 'Swimming Pool;Gym;Parking', 'Example Agency', 'agent@example.com', 'https://example.com/img1.jpg;https://example.com/img2.jpg', '33.8938', '35.5018'
    ];
    
    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'property_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProperties = async () => {
    if (exportListingTypes.length === 0 || exportPropertyTypes.length === 0 || exportStatuses.length === 0) {
      toast({
        title: "No Filters Selected",
        description: "Please select at least one option for each filter category",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      // Build query with filters
      let query = supabase
        .from('properties')
        .select(`
          *,
          agencies:agency_id (name)
        `);
      
      // Apply listing type filter
      if (exportListingTypes.length > 0 && exportListingTypes.length < 2) {
        query = query.in('listing_type', exportListingTypes as ("rent" | "sale")[]);
      }
      
      // Apply property type filter
      if (exportPropertyTypes.length > 0 && exportPropertyTypes.length < PROPERTY_TYPES.length) {
        query = query.in('property_type', exportPropertyTypes as ("apartment" | "duplex" | "house" | "loft" | "penthouse" | "studio" | "townhouse" | "villa")[]);
      }
      
      // Apply status filter
      if (exportStatuses.length > 0 && exportStatuses.length < PROPERTY_STATUSES.length) {
        query = query.in('status', exportStatuses as ("pending" | "approved" | "rejected")[]);
      }
      
      const { data: properties, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!properties || properties.length === 0) {
        toast({
          title: "No Properties",
          description: "No properties match the selected filters",
          variant: "destructive"
        });
        return;
      }

      // Get property agents for each property
      const { data: propertyAgents } = await supabase
        .from('property_agents')
        .select('property_id, agent_id');

      // Create a map of property_id to agent emails (we'll use agent_id for now)
      const agentMap = new Map<string, string>();
      if (propertyAgents) {
        for (const pa of propertyAgents) {
          // Get agent email using the RPC function
          const { data: agentData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', pa.agent_id)
            .single();
          
          if (agentData) {
            agentMap.set(pa.property_id, agentData.full_name);
          }
        }
      }

      // CSV headers
      const headers = [
        'property_code', 'city', 'address', 'property_type', 'square_meters', 'bedrooms', 'bathrooms',
        'listing_type', 'price', 'price_negotiable', 'municipality', 'year_built',
        'last_renovated', 'amenities', 'agency_name', 'agent_name', 'images', 'latitude', 'longitude', 'status', 'created_at'
      ];

      // Escape CSV value
      const escapeCSV = (value: string | number | boolean | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Convert properties to CSV rows
      const rows = properties.map(prop => {
        const agencyName = prop.agencies && typeof prop.agencies === 'object' && 'name' in prop.agencies 
          ? (prop.agencies as { name: string }).name 
          : '';
        const agentName = agentMap.get(prop.id) || '';
        const amenitiesStr = (prop.amenities || []).join(';');
        const imagesStr = (prop.images || []).join(';');
        
        return [
          escapeCSV(prop.property_code),
          escapeCSV(prop.city),
          escapeCSV(prop.address),
          escapeCSV(prop.property_type),
          escapeCSV(prop.square_meters),
          escapeCSV(prop.bedrooms),
          escapeCSV(prop.bathrooms),
          escapeCSV(prop.listing_type),
          escapeCSV(prop.price),
          escapeCSV(prop.price_negotiable),
          escapeCSV(prop.municipality),
          escapeCSV(prop.year_built),
          escapeCSV(prop.last_renovated),
          escapeCSV(amenitiesStr),
          escapeCSV(agencyName),
          escapeCSV(agentName),
          escapeCSV(imagesStr),
          escapeCSV(prop.latitude),
          escapeCSV(prop.longitude),
          escapeCSV(prop.status),
          escapeCSV(prop.created_at)
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `properties_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${properties.length} properties`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export properties",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedData.filter(p => p.valid).length;
  const invalidCount = parsedData.filter(p => !p.valid).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Property Import
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple properties at once. All imported properties will be auto-approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and drop zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-3 rounded-full ${isDragOver ? 'bg-primary/10' : 'bg-muted'}`}>
                <Upload className={`w-6 h-6 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">
                  {isDragOver ? 'Drop your CSV file here' : 'Drag and drop your CSV file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click the button below to browse
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4 mr-2" />
                      Export Properties
                      {(exportListingTypes.length < 2 || exportPropertyTypes.length < PROPERTY_TYPES.length || exportStatuses.length < PROPERTY_STATUSES.length) && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Filtered
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Listing Type</h4>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="export-rent" 
                          checked={exportListingTypes.includes('rent')}
                          onCheckedChange={() => toggleExportListingType('rent')}
                        />
                        <Label htmlFor="export-rent" className="text-sm">For Rent</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="export-sale" 
                          checked={exportListingTypes.includes('sale')}
                          onCheckedChange={() => toggleExportListingType('sale')}
                        />
                        <Label htmlFor="export-sale" className="text-sm">For Sale</Label>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Property Types</h4>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={selectAllPropertyTypes}>
                          All
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAllPropertyTypes}>
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {PROPERTY_TYPES.map(type => (
                        <div key={type} className="flex items-center gap-2">
                          <Checkbox 
                            id={`export-${type}`}
                            checked={exportPropertyTypes.includes(type)}
                            onCheckedChange={() => toggleExportPropertyType(type)}
                          />
                          <Label htmlFor={`export-${type}`} className="text-sm capitalize">
                            {type.replace(/_/g, ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Property Status</h4>
                    <div className="flex gap-4 flex-wrap">
                      {PROPERTY_STATUSES.map(status => (
                        <div key={status} className="flex items-center gap-2">
                          <Checkbox 
                            id={`export-status-${status}`}
                            checked={exportStatuses.includes(status)}
                            onCheckedChange={() => toggleExportStatus(status)}
                          />
                          <Label htmlFor={`export-status-${status}`} className="text-sm capitalize">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <Button 
                    className="w-full" 
                    onClick={exportProperties}
                    disabled={isExporting || exportListingTypes.length === 0 || exportPropertyTypes.length === 0 || exportStatuses.length === 0}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </>
                    )}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Select CSV File"}
            </Button>

            {file && (
              <Button variant="ghost" size="sm" onClick={resetImport}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              {file.name}
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validation Results</CardTitle>
            <CardDescription className="flex gap-4">
              <span className="flex items-center gap-1">
                <Badge variant="default" className="bg-green-600">{validCount}</Badge> Valid
              </span>
              <span className="flex items-center gap-1">
                <Badge variant="destructive">{invalidCount}</Badge> Invalid
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  {invalidCount} row(s) have errors and will be skipped during import.
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-4 space-y-2">
                {parsedData.map((prop, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${prop.valid ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Thumbnail preview */}
                      {prop.images && prop.images.length > 0 ? (
                        <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden border bg-muted">
                          <img
                            src={prop.images[0]}
                            alt={`Preview for ${prop.address}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-full items-center justify-center text-xs text-muted-foreground" style={{ display: 'none' }}>No preview</div>
                        </div>
                      ) : (
                        <div className="shrink-0 w-16 h-16 rounded-md border bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground text-center px-1">No image</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {prop.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            Row {prop.row}: {prop.address || 'No address'}
                          </span>
                        </div>
                        <div className="ml-6 text-sm text-muted-foreground">
                          {prop.city} • {prop.property_type} • {prop.listing_type} • ${prop.price.toLocaleString()}
                          {prop.images && prop.images.length > 0 && (
                            <span className="ml-2 text-primary">• {prop.images.length} image(s)</span>
                          )}
                        </div>
                        {!prop.valid && (
                          <div className="ml-6 mt-1 text-sm text-destructive">
                            {prop.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Importing properties...</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  {importResult.success} properties imported successfully.
                  {importResult.failed > 0 && ` ${importResult.failed} failed.`}
                </AlertDescription>
              </Alert>
            )}

            {!importResult && (
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {validCount} Properties
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
