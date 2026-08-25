import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface ErrorDialogProps {
  open: boolean;
  title?: string;
  description: string | null;
  onClose: () => void;
}

export function ErrorDialog({
  open,
  title = "Stock Alert",
  description,
  onClose,
}: ErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-md text-center">
        <AlertDialogHeader className="flex flex-col items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center text-lg font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-xs sm:text-sm text-muted-foreground mt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="sm:justify-center mt-2">
          <AlertDialogAction
            onClick={onClose}
            className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold px-6"
          >
            Understand & Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}