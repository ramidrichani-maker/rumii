import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">
            Broker Agreement & Service Terms
          </p>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle>1. Introduction</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Welcome to Summit Real Estate ("Summit," "we," "us," or "our"). These Terms of Service 
                ("Terms") govern your use of our platform and services. By listing a property on Summit, 
                you agree to be bound by these Terms and our Broker Agreement.
              </p>
              <p>
                Please read these Terms carefully before using our services. If you do not agree with 
                any part of these Terms, you may not use our platform.
              </p>
            </CardContent>
          </Card>

          {/* Broker Agreement */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>2. Exclusive Broker Agreement</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <p>
                By listing your property on Summit, you acknowledge and agree to the following:
              </p>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">2.1 Appointment as Exclusive Broker</h4>
                <p className="text-sm">
                  You hereby appoint Summit as your exclusive real estate broker for the purpose of 
                  marketing, advertising, and facilitating the sale or rental of your listed property. 
                  This appointment grants Summit the sole and exclusive right to represent you in all 
                  matters related to the transaction of your property.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">2.2 Duration of Agreement</h4>
                <p className="text-sm">
                  This exclusive broker agreement shall remain in effect for a period of twelve (12) months 
                  from the date your property is listed, unless terminated earlier in accordance with 
                  Section 7 of these Terms. The agreement may be renewed upon mutual written consent.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">2.3 Scope of Exclusivity</h4>
                <p className="text-sm">
                  During the term of this agreement, you agree not to engage any other real estate broker, 
                  agent, or intermediary for the sale or rental of the listed property. Any transaction 
                  resulting from inquiries received during the listing period shall be subject to our 
                  commission structure, regardless of when the transaction closes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Services Provided */}
          <Card>
            <CardHeader>
              <CardTitle>3. Services Provided</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>As your exclusive broker, Summit agrees to provide the following services:</p>
              <ul className="space-y-2 mt-4">
                <li>
                  <strong>Professional Marketing:</strong> We will create professional listings with 
                  high-quality photography, virtual tours, and compelling property descriptions.
                </li>
                <li>
                  <strong>Agent Assignment:</strong> A dedicated agent will be assigned to manage your 
                  property listing, coordinate viewings, and communicate with potential buyers or tenants.
                </li>
                <li>
                  <strong>Property Viewings:</strong> We will schedule, coordinate, and conduct property 
                  viewings with qualified prospects at times convenient for you.
                </li>
                <li>
                  <strong>Negotiation Services:</strong> Our experienced agents will negotiate on your 
                  behalf to secure the best possible terms for your sale or rental.
                </li>
                <li>
                  <strong>Transaction Support:</strong> We will assist with all paperwork, legal 
                  documentation, and closing procedures related to your transaction.
                </li>
                <li>
                  <strong>Market Analysis:</strong> We provide pricing recommendations based on current 
                  market conditions, comparable properties, and local trends.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Commission and Fees */}
          <Card>
            <CardHeader>
              <CardTitle>4. Commission and Fees</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">4.1 Sales Commission</h4>
                <p className="text-sm">
                  For property sales, Summit shall receive a commission equal to five percent (5%) of 
                  the final sale price. This commission is payable upon successful closing of the 
                  transaction and transfer of ownership.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">4.2 Rental Commission</h4>
                <p className="text-sm">
                  For rental properties, Summit shall receive a commission equal to one (1) month's rent 
                  for lease terms of twelve (12) months or longer. For shorter lease terms, the commission 
                  shall be prorated accordingly.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">4.3 Additional Services</h4>
                <p className="text-sm">
                  Photography services, premium listing placements, and other optional services may 
                  incur additional fees. These fees will be clearly communicated and agreed upon 
                  before any additional services are rendered.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Property Owner Obligations */}
          <Card>
            <CardHeader>
              <CardTitle>5. Property Owner Obligations</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>As a property owner listing with Summit, you agree to:</p>
              <ul className="space-y-2 mt-4">
                <li>
                  Provide accurate and complete information about your property, including but not 
                  limited to size, condition, amenities, and any known defects.
                </li>
                <li>
                  Maintain the property in showable condition and allow reasonable access for 
                  viewings with appropriate notice.
                </li>
                <li>
                  Inform Summit immediately of any changes to the property's status, price, or availability.
                </li>
                <li>
                  Provide all necessary legal documentation, including proof of ownership, required 
                  permits, and any relevant property disclosures.
                </li>
                <li>
                  Not engage in parallel negotiations or listings with other brokers or platforms 
                  during the exclusivity period.
                </li>
                <li>
                  Respond promptly to communications from Summit and potential buyers or tenants.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Representations and Warranties */}
          <Card>
            <CardHeader>
              <CardTitle>6. Representations and Warranties</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>By listing your property, you represent and warrant that:</p>
              <ul className="space-y-2 mt-4">
                <li>
                  You are the legal owner of the property or have been duly authorized by the owner 
                  to list and transact the property.
                </li>
                <li>
                  The property is not subject to any pending litigation, liens, or encumbrances that 
                  would prevent or complicate a sale or rental.
                </li>
                <li>
                  All information provided about the property is true, accurate, and complete to the 
                  best of your knowledge.
                </li>
                <li>
                  You have the legal capacity and authority to enter into this agreement and any 
                  resulting sale or rental transaction.
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card>
            <CardHeader>
              <CardTitle>7. Termination</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">7.1 Termination by Property Owner</h4>
                <p className="text-sm">
                  You may terminate this agreement with thirty (30) days written notice. If termination 
                  occurs after a prospective buyer or tenant has been introduced by Summit, and a 
                  transaction closes within six (6) months of termination, the applicable commission 
                  shall still be due.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">7.2 Termination by Summit</h4>
                <p className="text-sm">
                  Summit reserves the right to terminate this agreement at any time if you breach any 
                  provision of these Terms, provide false information, or engage in conduct that is 
                  harmful to Summit's reputation or interests.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">7.3 Effect of Termination</h4>
                <p className="text-sm">
                  Upon termination, Summit will remove your property listing from our platform. 
                  However, the confidentiality obligations and any accrued payment obligations shall 
                  survive termination.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle>8. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                To the maximum extent permitted by law, Summit shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, including but not limited to 
                loss of profits, data, or business opportunities, arising out of or related to your 
                use of our services.
              </p>
              <p className="mt-4">
                Summit's total liability for any claims arising from these Terms or your use of our 
                services shall not exceed the total commission paid to Summit for your property 
                transaction.
              </p>
            </CardContent>
          </Card>

          {/* Dispute Resolution */}
          <Card>
            <CardHeader>
              <CardTitle>9. Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Any disputes arising from these Terms or the broker agreement shall first be addressed 
                through good-faith negotiation between the parties. If negotiation fails, disputes 
                shall be resolved through binding arbitration in accordance with the rules of the 
                local arbitration association.
              </p>
              <p className="mt-4">
                This agreement shall be governed by and construed in accordance with the laws of 
                Lebanon, without regard to its conflict of law provisions.
              </p>
            </CardContent>
          </Card>

          {/* Amendments */}
          <Card>
            <CardHeader>
              <CardTitle>10. Amendments</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                Summit reserves the right to modify these Terms at any time. We will notify you of 
                any material changes by posting the updated Terms on our platform and updating the 
                "Last Modified" date. Your continued use of our services after such modifications 
                constitutes your acceptance of the updated Terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>11. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                If you have any questions about these Terms or our broker agreement, please contact us:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <p className="text-sm">
                  <strong>Summit Real Estate</strong><br />
                  Email: legal@summit-realestate.com<br />
                  Phone: +961 XX XXX XXX<br />
                  Address: Beirut, Lebanon
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <p className="text-sm text-muted-foreground text-center">
            Last Modified: January 2, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
