import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Attendance } from "@shared/schema";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CheckButtonProps {
  currentAttendance?: Attendance;
}

export function CheckButton({ currentAttendance }: CheckButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [errorDialog, setErrorDialog] = useState({ open: false, title: "", message: "" });
  
  // Check if already checked in but not checked out
  const isCheckedIn = !!currentAttendance?.checkInTime;
  const isCheckedOut = !!currentAttendance?.checkOutTime;
  const canCheckIn = !isCheckedIn || isCheckedOut;
  
  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/attendance/check-in", {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch specific user attendance queries
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", { userId: user?.id }] });
      queryClient.refetchQueries({ queryKey: ["/api/attendance", { userId: user?.id }] });
      toast({
        title: "Checked in",
        description: "You have successfully checked in for today.",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        open: true,
        title: "Check-in Failed",
        message: error.message,
      });
    },
  });
  
  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/attendance/check-out", {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch specific user attendance queries
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", { userId: user?.id }] });
      queryClient.refetchQueries({ queryKey: ["/api/attendance", { userId: user?.id }] });
      toast({
        title: "Checked out",
        description: "You have successfully checked out for today.",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        open: true,
        title: "Check-out Failed",
        message: error.message,
      });
    },
  });
  
  // Handle check in button click
  const handleCheckIn = () => {
    checkInMutation.mutate();
  };
  
  // Handle check out button click
  const handleCheckOut = () => {
    checkOutMutation.mutate();
  };

  return (
    <>
      {canCheckIn ? (
        <Button 
          onClick={handleCheckIn}
          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-6 py-3 border-0"
          disabled={checkInMutation.isPending}
          size="lg"
        >
          {checkInMutation.isPending ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="mr-3 h-5 w-5" />
          )}
          Check In
        </Button>
      ) : (
        <Button 
          onClick={handleCheckOut}
          variant="outline"
          className="border-2 border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-6 py-3 bg-white"
          disabled={checkOutMutation.isPending || isCheckedOut}
          size="lg"
        >
          {checkOutMutation.isPending ? (
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="mr-3 h-5 w-5" />
          )}
          {isCheckedOut ? "Checked Out" : "Check Out"}
        </Button>
      )}

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog(prev => ({ ...prev, open: false }))}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
