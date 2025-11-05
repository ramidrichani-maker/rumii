import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface PropertyDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  propertyAddress: string;
}

export const PropertyDeleteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  propertyAddress,
}: PropertyDeleteDialogProps) => {
  const [deleteReason, setDeleteReason] = useState<string>("sold");
  const [customReason, setCustomReason] = useState("");

  const handleConfirm = () => {
    const finalReason = deleteReason === "other" ? customReason : deleteReason;
    // Optimistically close the dialog to avoid overlay freeze in controlled mode
    onOpenChange(false);
    onConfirm(finalReason);
    // Reset state
    setDeleteReason("sold");
    setCustomReason("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setDeleteReason("sold");
    setCustomReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Property Listing</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete the property at <strong>{propertyAddress}</strong>. 
            This action cannot be undone. Please select a reason for deletion:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <RadioGroup value={deleteReason} onValueChange={setDeleteReason}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sold" id="sold" />
              <Label htmlFor="sold" className="cursor-pointer">
                Listing sold/rented
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no_longer_listed" id="no_longer_listed" />
              <Label htmlFor="no_longer_listed" className="cursor-pointer">
                I no longer want it listed
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="other" />
              <Label htmlFor="other" className="cursor-pointer">
                Other
              </Label>
            </div>
          </RadioGroup>

          {deleteReason === "other" && (
            <div className="mt-4">
              <Label htmlFor="custom-reason">Please specify the reason:</Label>
              <Textarea
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value.slice(0, 500))}
                placeholder="Enter your reason here..."
                className="mt-2"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {customReason.length}/500 characters
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteReason === "other" && !customReason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Property
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
