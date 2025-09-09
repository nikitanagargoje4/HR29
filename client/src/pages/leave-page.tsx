import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LeaveForm } from "@/components/leave/leave-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  FileText,
  Check,
  X,
  CalendarDays,
  UserCheck,
  Timer,
  Target,
  Activity,
  BarChart3,
  Award,
  Briefcase,
  Search,
  Filter,
  Eye,
  Settings,
  ChevronRight,
  Star,
  Crown,
  User as UserIcon,
  Mail,
  Building2,
  MapPin,
  Phone
} from "lucide-react";
import { LeaveRequest, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { format, eachDayOfInterval, isWeekend, subMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function LeavePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Fetch leave requests for current user
  const { data: myLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { userId: user?.id }],
    enabled: !!user,
  });
  
  // Fetch pending leave requests (for admins/HR/managers)
  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { status: "pending" }],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });
  
  // Fetch all leave requests for analytics
  const { data: allLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });
  
  // Fetch all employees to display names
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: !!user,
  });
  
  // Approve leave request
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PUT", `/api/leave-requests/${requestId}`, {
        status: "approved",
        approvedById: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request approved",
        description: "The leave request has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to approve request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Reject leave request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PUT", `/api/leave-requests/${requestId}`, {
        status: "rejected",
        approvedById: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request rejected",
        description: "The leave request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reject request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Cancel leave request
  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("DELETE", `/api/leave-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request canceled",
        description: "Your leave request has been canceled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to cancel request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Get user info by ID
  const getUserById = (userId: number) => {
    return employees.find(emp => emp.id === userId);
  };
  
  // Format date range
  const formatDateRange = (start: string | Date, end: string | Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };
  
  // Calculate duration in business days (excluding weekends)
  const calculateDuration = (start: string | Date, end: string | Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (!startDate || !endDate || endDate < startDate) return '0 days';
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const businessDays = allDays.filter(day => !isWeekend(day));
    
    const diffDays = businessDays.length;
    return `${diffDays} working day${diffDays !== 1 ? 's' : ''}`;
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };

  // Get leave type icon
  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'annual': return <Calendar className="w-4 h-4" />;
      case 'sick': return <Target className="w-4 h-4" />;
      case 'personal': return <Star className="w-4 h-4" />;
      case 'halfday': return <Clock className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get leave type badge variant
  const getLeaveTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'annual': return "default";
      case 'sick': return "secondary";  
      case 'personal': return "outline";
      default: return "outline";
    }
  };

  // Calculate leave balances
  const calculateLeaveBalance = (type: string) => {
    const annual = 20;
    const sick = 10;
    const personal = 5;
    const halfday = 12;
    
    const used = myLeaveRequests
      .filter(request => request.status === "approved" && request.type === type)
      .reduce((total, request) => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        
        if (type === "halfday") {
          return total + 1;
        } else {
          const allDays = eachDayOfInterval({ start, end });
          const businessDays = allDays.filter(day => !isWeekend(day));
          return total + businessDays.length;
        }
      }, 0);
    
    switch (type) {
      case "annual": return { total: annual, used, remaining: annual - used };
      case "sick": return { total: sick, used, remaining: sick - used };
      case "personal": return { total: personal, used, remaining: personal - used };
      case "halfday": return { total: halfday, used, remaining: halfday - used };
      default: return { total: 0, used: 0, remaining: 0 };
    }
  };

  // Calculate analytics
  const getLeaveAnalytics = () => {
    const thisMonth = new Date();
    const lastMonth = subMonths(thisMonth, 1);
    
    const thisMonthRequests = allLeaveRequests.filter(req => {
      const createdAt = new Date(req.createdAt || req.startDate);
      return createdAt.getMonth() === thisMonth.getMonth() && 
             createdAt.getFullYear() === thisMonth.getFullYear();
    });

    const approvedRequests = allLeaveRequests.filter(req => req.status === 'approved');
    const rejectedRequests = allLeaveRequests.filter(req => req.status === 'rejected');

    return {
      totalRequests: allLeaveRequests.length,
      pendingCount: pendingRequests.length,
      approvedCount: approvedRequests.length,
      rejectedCount: rejectedRequests.length,
      thisMonthRequests: thisMonthRequests.length,
    };
  };

  const analytics = getLeaveAnalytics();

  // Filter leave requests based on search
  const filteredMyRequests = myLeaveRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.type.toLowerCase().includes(searchLower) ||
      (request.reason && request.reason.toLowerCase().includes(searchLower)) ||
      (request.status && request.status.toLowerCase().includes(searchLower))
    );
  });

  const filteredPendingRequests = pendingRequests.filter(request => {
    const employee = getUserById(request.userId);
    const searchLower = searchQuery.toLowerCase();
    return (
      request.type.toLowerCase().includes(searchLower) ||
      (request.reason && request.reason.toLowerCase().includes(searchLower)) ||
      (employee && `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower))
    );
  });

  // Handler for viewing leave details
  const handleView = (leaveRequest: LeaveRequest) => {
    setSelectedLeave(leaveRequest);
    setIsViewOpen(true);
  };

  // Handler for editing leave
  const handleEdit = (leaveRequest: LeaveRequest) => {
    setSelectedLeave(leaveRequest);
    setIsEditOpen(true);
  };

  // Leave Request Card Component
  const LeaveRequestCard = ({ request, index, showEmployee = false }: { request: LeaveRequest; index: number; showEmployee?: boolean }) => {
    const employee = getUserById(request.userId);
    const isPending = request.status === 'pending';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card className="group border-2 border-slate-200 shadow-lg hover:shadow-2xl hover:border-teal-300 transition-all duration-300 bg-gradient-to-br from-white via-slate-50 to-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardContent className="p-6 relative z-10">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {showEmployee && employee ? (
                    <>
                      <Avatar className="h-12 w-12 border-3 border-white shadow-lg">
                        <AvatarImage 
                          src={employee.photoUrl || ""} 
                          alt={`${employee.firstName} ${employee.lastName}`}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-sm font-bold">
                          {employee.firstName[0]}{employee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-900 transition-colors duration-300">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium">
                          {employee.position || "Employee"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl shadow-lg">
                        {getLeaveTypeIcon(request.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-900 transition-colors duration-300 capitalize">
                          {request.type} Leave
                        </h3>
                        <p className="text-sm text-slate-600 font-medium">
                          {calculateDuration(request.startDate, request.endDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleView(request)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-teal-100"
                  >
                    <Eye className="h-4 w-4 text-teal-600" />
                  </Button>
                  {isPending && !showEmployee && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(request)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-slate-100"
                    >
                      <Settings className="h-4 w-4 text-slate-600" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <CalendarDays className="w-4 h-4 text-teal-500" />
                  <span>{formatDateRange(request.startDate, request.endDate)}</span>
                </div>
                {request.reason && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="truncate">{request.reason}</span>
                  </div>
                )}
              </div>
              
              {/* Badges and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <Badge variant={getLeaveTypeBadgeVariant(request.type)} className="text-xs font-medium capitalize">
                    {getLeaveTypeIcon(request.type)}
                    <span className="ml-1">{request.type}</span>
                  </Badge>
                  {getStatusBadge(request.status || 'pending')}
                </div>
                
                {showEmployee && isPending ? (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 font-medium text-xs px-3 py-1"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-medium text-xs px-3 py-1"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(request)}
                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium text-xs px-3 py-1 group-hover:shadow-sm transition-all duration-300"
                  >
                    View Details
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Executive Header Section */}
        <div className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 -mx-6 -mt-6 px-6 py-8 border-b-2 border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-4 rounded-2xl shadow-lg">
                <Calendar className="w-8 h-8 text-teal-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                  Leave Management
                </h1>
                <p className="text-slate-600 text-lg">
                  Manage leave requests and track time off
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-xl px-4 py-3 shadow-md border border-slate-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-600">My Requests</div>
                    <div className="text-2xl font-bold text-slate-900">{myLeaveRequests.length}</div>
                  </div>
                </div>
              </div>
              
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:via-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 h-auto text-white font-semibold">
                    <Plus className="h-5 w-5 mr-2" />
                    Apply for Leave
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Apply for Leave</DialogTitle>
                  </DialogHeader>
                  <LeaveForm 
                    onSuccess={() => {
                      setIsAddOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-700 mb-1">Total Requests</div>
                      <div className="text-3xl font-bold text-blue-900">{analytics.totalRequests}</div>
                      <div className="text-xs text-blue-600 mt-1">All leave requests</div>
                    </div>
                    <div className="bg-blue-500 p-3 rounded-xl">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-amber-700 mb-1">Pending Approval</div>
                      <div className="text-3xl font-bold text-amber-900">{analytics.pendingCount}</div>
                      <div className="text-xs text-amber-600 mt-1">Awaiting decision</div>
                    </div>
                    <div className="bg-amber-500 p-3 rounded-xl">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-emerald-700 mb-1">Approved</div>
                      <div className="text-3xl font-bold text-emerald-900">{analytics.approvedCount}</div>
                      <div className="text-xs text-emerald-600 mt-1">Successfully approved</div>
                    </div>
                    <div className="bg-emerald-500 p-3 rounded-xl">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-indigo-50 to-indigo-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-indigo-700 mb-1">This Month</div>
                      <div className="text-3xl font-bold text-indigo-900">{analytics.thisMonthRequests}</div>
                      <div className="text-xs text-indigo-600 mt-1">New this month</div>
                    </div>
                    <div className="bg-indigo-500 p-3 rounded-xl">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          // Personal Leave Balance Cards for Regular Employees
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-700 mb-1">Annual Leave</div>
                      <div className="text-3xl font-bold text-blue-900">{calculateLeaveBalance("annual").remaining}</div>
                      <div className="text-xs text-blue-600 mt-1">of {calculateLeaveBalance("annual").total} days</div>
                    </div>
                    <div className="bg-blue-500 p-3 rounded-xl">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-red-700 mb-1">Sick Leave</div>
                      <div className="text-3xl font-bold text-red-900">{calculateLeaveBalance("sick").remaining}</div>
                      <div className="text-xs text-red-600 mt-1">of {calculateLeaveBalance("sick").total} days</div>
                    </div>
                    <div className="bg-red-500 p-3 rounded-xl">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-purple-700 mb-1">Personal Leave</div>
                      <div className="text-3xl font-bold text-purple-900">{calculateLeaveBalance("personal").remaining}</div>
                      <div className="text-xs text-purple-600 mt-1">of {calculateLeaveBalance("personal").total} days</div>
                    </div>
                    <div className="bg-purple-500 p-3 rounded-xl">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-orange-700 mb-1">Half Days</div>
                      <div className="text-3xl font-bold text-orange-900">{calculateLeaveBalance("halfday").remaining}</div>
                      <div className="text-xs text-orange-600 mt-1">of {calculateLeaveBalance("halfday").total} half-days</div>
                    </div>
                    <div className="bg-orange-500 p-3 rounded-xl">
                      <Timer className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search leave requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="bg-white border-2 border-slate-200 shadow-lg">
              <TabsTrigger 
                value="my-requests" 
                className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 font-medium"
              >
                <Users className="w-4 h-4 mr-2" />
                My Requests
              </TabsTrigger>
              {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                <TabsTrigger 
                  value="pending-approvals"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 font-medium"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Approvals
                  {pendingRequests.length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white font-bold px-2 py-1 rounded-full text-xs">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="my-requests" className="space-y-6">
            {filteredMyRequests.length > 0 ? (
              <Card className="border-2 border-slate-200 shadow-lg bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <TableHead className="font-bold text-slate-700">Leave Type</TableHead>
                        <TableHead className="font-bold text-slate-700">Date Range</TableHead>
                        <TableHead className="font-bold text-slate-700">Duration</TableHead>
                        <TableHead className="font-bold text-slate-700">Reason</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                        <TableHead className="font-bold text-slate-700 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMyRequests.map((request, index) => (
                        <motion.tr
                          key={request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="group hover:bg-teal-50/50 transition-colors duration-200"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-2">
                              <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-2 rounded-lg">
                                {getLeaveTypeIcon(request.type)}
                              </div>
                              <Badge variant={getLeaveTypeBadgeVariant(request.type)} className="capitalize font-medium">
                                {request.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-1">
                              <CalendarDays className="w-4 h-4 text-teal-500" />
                              <span className="text-slate-700 font-medium">
                                {formatDateRange(request.startDate, request.endDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-1">
                              <Timer className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-600 font-medium">
                                {calculateDuration(request.startDate, request.endDate)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-slate-600 max-w-xs truncate block">
                              {request.reason || "No reason provided"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            {getStatusBadge(request.status || 'pending')}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleView(request)}
                                className="h-8 px-3 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {(request.status === 'pending') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(request)}
                                  className="h-8 px-3 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No leave requests</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by applying for leave.</p>
              </div>
            )}
          </TabsContent>

          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
            <TabsContent value="pending-approvals" className="space-y-6">
              {filteredPendingRequests.length > 0 ? (
                <Card className="border-2 border-slate-200 shadow-lg bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                          <TableHead className="font-bold text-slate-700">Employee</TableHead>
                          <TableHead className="font-bold text-slate-700">Leave Type</TableHead>
                          <TableHead className="font-bold text-slate-700">Date Range</TableHead>
                          <TableHead className="font-bold text-slate-700">Duration</TableHead>
                          <TableHead className="font-bold text-slate-700">Reason</TableHead>
                          <TableHead className="font-bold text-slate-700 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingRequests.map((request, index) => {
                          const employee = getUserById(request.userId);
                          return (
                            <motion.tr
                              key={request.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="group hover:bg-amber-50/50 transition-colors duration-200"
                            >
                              <TableCell className="py-4">
                                {employee && (
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                      <AvatarImage 
                                        src={employee.photoUrl || ""} 
                                        alt={`${employee.firstName} ${employee.lastName}`}
                                      />
                                      <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-xs font-bold">
                                        {employee.firstName[0]}{employee.lastName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {employee.firstName} {employee.lastName}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {employee.position || "Employee"}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant={getLeaveTypeBadgeVariant(request.type)} className="capitalize font-medium">
                                  {getLeaveTypeIcon(request.type)}
                                  <span className="ml-1">{request.type}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-1">
                                  <CalendarDays className="w-4 h-4 text-teal-500" />
                                  <span className="text-slate-700 font-medium">
                                    {formatDateRange(request.startDate, request.endDate)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center space-x-1">
                                  <Timer className="w-4 h-4 text-slate-500" />
                                  <span className="text-slate-600 font-medium">
                                    {calculateDuration(request.startDate, request.endDate)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-slate-600 max-w-xs truncate block">
                                  {request.reason || "No reason provided"}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleView(request)}
                                    className="h-8 px-3 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => rejectMutation.mutate(request.id)}
                                    disabled={rejectMutation.isPending}
                                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => approveMutation.mutate(request.id)}
                                    disabled={approveMutation.isPending}
                                    className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </div>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">All caught up!</h3>
                  <p className="mt-1 text-sm text-slate-500">No pending approvals at this time.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
        
        {/* Edit leave request dialog */}
        {selectedLeave && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Leave Request</DialogTitle>
              </DialogHeader>
              <LeaveForm 
                leaveRequest={selectedLeave}
                onSuccess={() => {
                  setIsEditOpen(false);
                  setSelectedLeave(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* View leave details dialog */}
        {selectedLeave && (
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                  Leave Request Details
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Leave Type:</span>
                  <Badge variant={getLeaveTypeBadgeVariant(selectedLeave.type)} className="capitalize">
                    {getLeaveTypeIcon(selectedLeave.type)}
                    <span className="ml-1">{selectedLeave.type}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  {getStatusBadge(selectedLeave.status || 'pending')}
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Date Range:</span>
                  <p className="text-sm text-slate-900 mt-1">{formatDateRange(selectedLeave.startDate, selectedLeave.endDate)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Duration:</span>
                  <p className="text-sm text-slate-900 mt-1">{calculateDuration(selectedLeave.startDate, selectedLeave.endDate)}</p>
                </div>
                {selectedLeave.reason && (
                  <div>
                    <span className="text-sm font-medium text-slate-600">Reason:</span>
                    <p className="text-sm text-slate-900 mt-1">{selectedLeave.reason}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}