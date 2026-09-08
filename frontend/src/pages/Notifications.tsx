import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertTriangle,
  Info,
  Target,
  Megaphone,
  Settings,
  Trash2,
  Filter,
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Lightbulb,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_audience: string;
  created_at: string;
  created_by: string;
  read_by: string[];
  action_required: boolean;
  action_url?: string;
  metadata: any;
}

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    unread_only: false,
    priority: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch notifications
  const { data: notificationsData, isLoading, refetch } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => apiClient.getNotifications(filters),
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => apiClient.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create priority notification
  const createPriorityNotificationMutation = useMutation({
    mutationFn: (data: any) => apiClient.createPriorityNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "Priority notification created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Generate marketing brief
  const createMarketingBriefMutation = useMutation({
    mutationFn: (data: any) => apiClient.createMarketingBrief(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: "Success",
        description: "Marketing brief generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_generated':
        return <Lightbulb className="h-4 w-4 text-yellow-600" />;
      case 'marketing_brief':
        return <Target className="h-4 w-4 text-purple-600" />;
      case 'priority_alert':
        return <BellRing className="h-4 w-4 text-red-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isUnread = (notification: Notification) => {
    // This would need to be checked against current user
    return !notification.read_by?.includes('current_user_email'); // Replace with actual user
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      
      return date.toLocaleDateString();
    } catch {
      return 'Unknown time';
    }
  };

  const generateTestMarketingBrief = () => {
    // This would typically get real positive reviews
    const mockPositiveReviews = [
      {
        review_text: "Amazing stay! The property was exactly as described and the host was incredibly responsive.",
        rating: 5,
        property_id: "prop_001"
      },
      {
        review_text: "Beautiful location and excellent amenities. Would definitely book again!",
        rating: 5,
        property_id: "prop_002"
      }
    ];
    
    createMarketingBriefMutation.mutate({
      positive_reviews: mockPositiveReviews,
      context: {
        property_count: 2,
        average_rating: 5.0,
        generated_at: new Date().toISOString()
      }
    });
  };

  const createTestPriorityNotification = (priorityType: string) => {
    createPriorityNotificationMutation.mutate({
      priority_type: priorityType,
      team: "management",
      description: "Test notification for development purposes",
      source: "manual_test"
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Stay updated with AI-powered insights and priority alerts for your properties
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setFilters({ ...filters, unread_only: !filters.unread_only })}
              variant={filters.unread_only ? "default" : "outline"}
            >
              {filters.unread_only ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
              {filters.unread_only ? 'Show All' : 'Unread Only'}
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              <BellRing className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notificationsData?.total_count || 0}</div>
              <p className="text-xs text-muted-foreground">All time notifications</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Priority Alerts</CardTitle>
              <BellRing className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications.filter(n => ['high', 'critical'].includes(n.priority)).length}
              </div>
              <p className="text-xs text-muted-foreground">High priority items</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notifications.filter(n => n.type === 'ai_generated' || n.type === 'marketing_brief').length}
              </div>
              <p className="text-xs text-muted-foreground">Smart insights</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Test Priority Notifications</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createTestPriorityNotification('high_priority')}
                    disabled={createPriorityNotificationMutation.isPending}
                  >
                    High Priority
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createTestPriorityNotification('opportunity')}
                    disabled={createPriorityNotificationMutation.isPending}
                  >
                    Opportunity
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createTestPriorityNotification('technical')}
                    disabled={createPriorityNotificationMutation.isPending}
                  >
                    Technical
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Generate Marketing Brief</h4>
                <Button
                  size="sm"
                  onClick={generateTestMarketingBrief}
                  disabled={createMarketingBriefMutation.isPending}
                  className="w-full"
                >
                  <Megaphone className="mr-2 h-4 w-4" />
                  {createMarketingBriefMutation.isPending ? 'Generating...' : 'Generate from Reviews'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Search notifications..."
                    className="w-full pl-9 p-2 border rounded-md bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => setFilters({ ...filters, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All priorities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Items per page</label>
                <Select
                  value={filters.limit.toString()}
                  onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 items</SelectItem>
                    <SelectItem value="20">20 items</SelectItem>
                    <SelectItem value="50">50 items</SelectItem>
                    <SelectItem value="100">100 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications ({notificationsData?.total_count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="divide-y">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.notification_id}
                    className={`p-6 transition-colors ${
                      isUnread(notification) 
                        ? 'bg-blue-50/50 border-l-4 border-l-blue-500' 
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeIcon(notification.type)}
                        {getPriorityIcon(notification.priority)}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className={`font-semibold ${isUnread(notification) ? 'text-blue-900' : 'text-foreground'}`}>
                              {notification.title}
                              {isUnread(notification) && (
                                <Badge className="ml-2 bg-blue-600 text-white text-xs">NEW</Badge>
                              )}
                            </h3>
                            <p className="text-muted-foreground">{notification.message}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            {notification.action_required && (
                              <Badge variant="outline" className="text-orange-600">
                                Action Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>From: {notification.created_by}</span>
                            <span>{formatDate(notification.created_at)}</span>
                            <span>Audience: {notification.target_audience}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isUnread(notification) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(notification.notification_id)}
                                disabled={markAsReadMutation.isPending}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Read
                              </Button>
                            )}
                            
                            {notification.action_url && (
                              <Button size="sm" asChild>
                                <Link to={notification.action_url}>
                                  Take Action
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground mb-4">
                  You're all caught up! New notifications will appear here when they arrive.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  <BellRing className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {notificationsData && notificationsData.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {notificationsData.page} of {notificationsData.total_pages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={notificationsData.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={notificationsData.page >= notificationsData.total_pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;