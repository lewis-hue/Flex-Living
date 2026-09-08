/**
 * Export Functionality Component
 * Handles PDF, CSV, and scheduled report generation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar, 
  FileText, 
  Table, 
  Mail, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ExportRequest, 
  AnalyticsFilter 
} from '@/types/analytics';
import { AnalyticsAPI } from '@/services/analyticsAPI';

interface ExportFunctionalityProps {
  filters: AnalyticsFilter;
  data?: any;
  onExportComplete?: () => void;
}

interface ScheduledReport {
  id: string;
  name: string;
  format: 'pdf' | 'csv' | 'xlsx';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused' | 'error';
}

const ExportFunctionality: React.FC<ExportFunctionalityProps> = ({
  filters,
  data,
  onExportComplete
}) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    {
      id: '1',
      name: 'Weekly Portfolio Report',
      format: 'pdf',
      frequency: 'weekly',
      recipients: ['manager@flexliving.com', 'director@flexliving.com'],
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    },
    {
      id: '2',
      name: 'Monthly Executive Summary',
      format: 'xlsx',
      frequency: 'monthly',
      recipients: ['ceo@flexliving.com'],
      lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    }
  ]);

  const [newReport, setNewReport] = useState({
    name: '',
    format: 'pdf' as 'pdf' | 'csv' | 'xlsx',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recipients: '',
    dataTypes: ['portfolio', 'properties', 'reviews'],
    includeCharts: true,
    includeRawData: true
  });

  const handleImmediateExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
    setExportLoading(true);
    try {
      const exportRequest: ExportRequest = {
        format,
        data_types: newReport.dataTypes,
        filters,
        include_charts: newReport.includeCharts,
        include_raw_data: newReport.includeRawData
      };

      const response = await AnalyticsAPI.exportData(exportRequest);
      
      // Create download link
      const link = document.createElement('a');
      link.href = response.data.download_url;
      link.download = `flex-living-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (onExportComplete) {
        onExportComplete();
      }
    } catch (error) {
      console.error('Export failed:', error);
      // In a real app, you'd show a toast notification here
    } finally {
      setExportLoading(false);
    }
  };

  const handleScheduleReport = async () => {
    if (!newReport.name.trim() || !newReport.recipients.trim()) {
      return;
    }

    setScheduleLoading(true);
    try {
      const scheduleConfig = {
        name: newReport.name,
        format: newReport.format,
        frequency: newReport.frequency,
        recipients: newReport.recipients.split(',').map(email => email.trim()),
        filters,
        data_types: newReport.dataTypes,
        include_charts: newReport.includeCharts,
        include_raw_data: newReport.includeRawData
      };

      const response = await AnalyticsAPI.scheduleReport(scheduleConfig);
      
      // Add to local state
      const newScheduledReport: ScheduledReport = {
        id: response.data.schedule_id,
        name: newReport.name,
        format: newReport.format,
        frequency: newReport.frequency,
        recipients: scheduleConfig.recipients,
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + getFrequencyInMs(newReport.frequency)).toISOString(),
        status: 'active'
      };

      setScheduledReports(prev => [...prev, newScheduledReport]);
      
      // Reset form
      setNewReport({
        name: '',
        format: 'pdf',
        frequency: 'weekly',
        recipients: '',
        dataTypes: ['portfolio', 'properties', 'reviews'],
        includeCharts: true,
        includeRawData: true
      });
    } catch (error) {
      console.error('Failed to schedule report:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  const getFrequencyInMs = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const toggleReportStatus = (reportId: string) => {
    setScheduledReports(prev => prev.map(report => {
      if (report.id === reportId) {
        const newStatus = report.status === 'active' ? 'paused' : 'active';
        return { ...report, status: newStatus };
      }
      return report;
    }));
  };

  const deleteReport = async (reportId: string) => {
    try {
      await AnalyticsAPI.deleteScheduledReport(reportId);
      setScheduledReports(prev => prev.filter(report => report.id !== reportId));
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Immediate Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500" />
            Export Analytics Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              onClick={() => handleImmediateExport('pdf')}
              disabled={exportLoading}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export PDF Report
            </Button>
            
            <Button
              onClick={() => handleImmediateExport('csv')}
              disabled={exportLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Table className="h-4 w-4" />
              Export CSV Data
            </Button>
            
            <Button
              onClick={() => handleImmediateExport('xlsx')}
              disabled={exportLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>📊 Include: Portfolio overview, property performance, sentiment analysis, and AI insights</p>
            <p>📈 Charts and visualizations included in PDF/Excel exports</p>
            <p>⏱️ Processing time: 2-5 minutes for large datasets</p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Schedule Automated Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                placeholder="e.g., Weekly Executive Summary"
                value={newReport.name}
                onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select value={newReport.format} onValueChange={(value: any) => setNewReport(prev => ({ ...prev, format: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="csv">CSV Data</SelectItem>
                  <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={newReport.frequency} onValueChange={(value: any) => setNewReport(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated emails)</Label>
              <Input
                id="recipients"
                placeholder="manager@company.com, director@company.com"
                value={newReport.recipients}
                onChange={(e) => setNewReport(prev => ({ ...prev, recipients: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Data to Include</Label>
            <div className="flex flex-wrap gap-2">
              {['portfolio', 'properties', 'reviews', 'anomalies', 'insights'].map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReport.dataTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewReport(prev => ({ ...prev, dataTypes: [...prev.dataTypes, type] }));
                      } else {
                        setNewReport(prev => ({ ...prev, dataTypes: prev.dataTypes.filter(t => t !== type) }));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newReport.includeCharts}
                onChange={(e) => setNewReport(prev => ({ ...prev, includeCharts: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Charts & Visualizations</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newReport.includeRawData}
                onChange={(e) => setNewReport(prev => ({ ...prev, includeRawData: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Include Raw Data</span>
            </label>
          </div>
          
          <Button 
            onClick={handleScheduleReport}
            disabled={scheduleLoading || !newReport.name.trim() || !newReport.recipients.trim()}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
        </CardContent>
      </Card>

      {/* Existing Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-500" />
            Scheduled Reports ({scheduledReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    report.status === 'active' ? 'bg-green-500' :
                    report.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <h4 className="font-medium">{report.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {report.format.toUpperCase()} • {report.frequency} • 
                      Next: {new Date(report.nextRun).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recipients: {report.recipients.join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === 'active' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleReportStatus(report.id)}
                  >
                    {report.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteReport(report.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            
            {scheduledReports.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No scheduled reports yet</p>
                <p className="text-sm">Create your first automated report above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportFunctionality;